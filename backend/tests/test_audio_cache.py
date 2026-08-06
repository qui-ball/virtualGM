"""Tests for the narration audio cache. Always runs against a temp directory."""

from __future__ import annotations

import os
import stat
import subprocess
import time
from pathlib import Path

import pytest

from utils import audio_cache
from utils.audio_cache import (
    BYTES_PER_CHARACTER,
    MIN_PLAUSIBLE_FRACTION,
    cache_dir,
    cache_key,
    cleanup,
    get_cached_path,
    min_plausible_bytes,
    open_writer,
)

TEXT = "The lantern gutters. Something large shifts beyond the door."
MODEL = "deepgram/aura-2"
VOICE = "aura-2-orion-en"


@pytest.fixture(autouse=True)
def _temp_cache(tmp_path, monkeypatch):
    """Never touch the real cache."""
    monkeypatch.setenv("TTS_CACHE_DIR", str(tmp_path / "tts"))
    monkeypatch.delenv("TTS_CACHE_MAX_AGE_DAYS", raising=False)
    monkeypatch.delenv("TTS_MAX_CACHE_BYTES", raising=False)
    return tmp_path / "tts"


def plausible_audio(text: str = TEXT) -> bytes:
    return b"\xff\xfb" + b"a" * min_plausible_bytes(text)


def write_entry(key: str, payload: bytes, text: str = TEXT) -> Path:
    writer = open_writer(key, text)
    writer.write(payload)
    published = writer.commit()
    assert published is not None
    return published


# -- Keys --


def test_key_is_stable_for_identical_inputs():
    assert cache_key(TEXT, MODEL, VOICE) == cache_key(TEXT, MODEL, VOICE)
    assert len(cache_key(TEXT, MODEL, VOICE)) == 64


def test_key_changes_with_text_model_or_voice():
    base = cache_key(TEXT, MODEL, VOICE)
    assert cache_key(TEXT + "!", MODEL, VOICE) != base
    assert cache_key(TEXT, "deepgram/aura-2-other", VOICE) != base
    assert cache_key(TEXT, MODEL, "aura-2-thalia-en") != base


def test_key_separates_fields_that_could_otherwise_concatenate():
    """`ab|c` and `a|bc` must not collide."""
    assert cache_key("ab", "c", VOICE) != cache_key("a", "bc", VOICE)


# -- Miss, commit, hit --


def test_miss_returns_none():
    assert get_cached_path(cache_key(TEXT, MODEL, VOICE)) is None


def test_commit_publishes_a_readable_hit():
    key = cache_key(TEXT, MODEL, VOICE)
    payload = plausible_audio()

    published = write_entry(key, payload)

    hit = get_cached_path(key)
    assert hit == published
    assert hit is not None
    assert hit.read_bytes() == payload


def test_committed_file_is_owner_only():
    key = cache_key(TEXT, MODEL, VOICE)
    published = write_entry(key, plausible_audio())

    mode = stat.S_IMODE(published.stat().st_mode)
    assert mode & (stat.S_IRWXG | stat.S_IRWXO) == 0
    assert cache_dir().stat().st_mode & (stat.S_IRWXG | stat.S_IRWXO) == 0


def test_streamed_chunks_are_concatenated_in_order():
    key = cache_key(TEXT, MODEL, VOICE)
    head = b"\xff\xfb" + b"h" * 100
    tail = b"t" * min_plausible_bytes(TEXT)

    writer = open_writer(key, TEXT)
    writer.write(head)
    writer.write(tail)
    writer.commit()

    hit = get_cached_path(key)
    assert hit is not None
    assert hit.read_bytes() == head + tail


# -- Abandonment and short output --


def test_abandoned_write_leaves_no_files():
    key = cache_key(TEXT, MODEL, VOICE)
    writer = open_writer(key, TEXT)
    writer.write(plausible_audio())
    writer.abandon()

    assert get_cached_path(key) is None
    assert list(cache_dir().iterdir()) == []


def test_context_manager_abandons_when_commit_never_runs():
    key = cache_key(TEXT, MODEL, VOICE)
    with pytest.raises(RuntimeError), open_writer(key, TEXT) as writer:
        writer.write(plausible_audio())
        raise RuntimeError("stream died")

    assert get_cached_path(key) is None
    assert list(cache_dir().iterdir()) == []


def test_short_output_is_rejected_and_leaves_no_files():
    key = cache_key(TEXT, MODEL, VOICE)
    writer = open_writer(key, TEXT)
    writer.write(b"\xff\xfb" + b"a" * (min_plausible_bytes(TEXT) // 2))

    assert writer.commit() is None
    assert get_cached_path(key) is None
    assert list(cache_dir().iterdir()) == []


def test_min_plausible_bytes_follows_the_configured_estimate():
    assert min_plausible_bytes("x" * 400) == int(
        400 * BYTES_PER_CHARACTER * MIN_PLAUSIBLE_FRACTION
    )


# -- Atomic publication --


def test_partial_writes_are_never_visible_as_a_hit():
    key = cache_key(TEXT, MODEL, VOICE)
    writer = open_writer(key, TEXT)
    writer.write(plausible_audio()[:50])

    assert get_cached_path(key) is None

    writer.write(plausible_audio())
    writer.commit()
    assert get_cached_path(key) is not None


def test_concurrent_writers_use_distinct_temp_files_and_publish_whole_entries():
    key = cache_key(TEXT, MODEL, VOICE)
    first = open_writer(key, TEXT)
    second = open_writer(key, TEXT)
    assert first.temp_path != second.temp_path

    slow_payload = b"\xff\xfb" + b"1" * min_plausible_bytes(TEXT)
    fast_payload = b"\xff\xfb" + b"2" * min_plausible_bytes(TEXT)

    first.write(slow_payload[:20])
    second.write(fast_payload)
    second.commit()

    # The first writer is still mid-stream; the published entry must be whole.
    hit = get_cached_path(key)
    assert hit is not None
    assert hit.read_bytes() == fast_payload

    first.write(slow_payload[20:])
    first.commit()
    hit = get_cached_path(key)
    assert hit is not None
    assert hit.read_bytes() == slow_payload
    # Publishing twice must not leave stray partials behind.
    assert [p.name for p in cache_dir().iterdir()] == [f"{key}.mp3"]


# -- Cleanup --


def test_cleanup_removes_entries_older_than_the_age_limit(monkeypatch):
    monkeypatch.setenv("TTS_CACHE_MAX_AGE_DAYS", "7")
    fresh = write_entry(cache_key("fresh", MODEL, VOICE), plausible_audio())
    stale = write_entry(cache_key("stale", MODEL, VOICE), plausible_audio())
    old = time.time() - 8 * 86400
    os.utime(stale, (old, old))

    cleanup()

    assert fresh.exists()
    assert not stale.exists()


def test_cleanup_trims_oldest_first_toward_the_size_budget(monkeypatch):
    payload = plausible_audio()
    monkeypatch.setenv("TTS_MAX_CACHE_BYTES", str(len(payload) * 2))

    paths = []
    for index in range(4):
        path = write_entry(cache_key(f"beat-{index}", MODEL, VOICE), payload)
        stamp = time.time() - (10 - index) * 60
        os.utime(path, (stamp, stamp))
        paths.append(path)

    cleanup()

    assert not paths[0].exists()
    assert not paths[1].exists()
    assert paths[2].exists()
    assert paths[3].exists()


def test_cleanup_ignores_temp_files_and_a_missing_directory(monkeypatch, tmp_path):
    monkeypatch.setenv("TTS_CACHE_DIR", str(tmp_path / "never-created"))
    cleanup()  # must not raise

    monkeypatch.setenv("TTS_CACHE_DIR", str(tmp_path / "tts"))
    writer = open_writer(cache_key(TEXT, MODEL, VOICE), TEXT)
    writer.write(plausible_audio())
    cleanup()
    assert writer.temp_path.exists()
    writer.abandon()


def test_quiet_cleanup_is_safe_to_call_repeatedly():
    audio_cache.cleanup_quietly()
    audio_cache.cleanup_quietly()
    assert cache_dir().exists()


@pytest.mark.parametrize("raw", ["", "not-a-number", "0", "-3"])
def test_unusable_limits_fall_back_to_defaults(monkeypatch, raw):
    """A garbled or non-positive limit must never disable the safeguard."""
    monkeypatch.setenv("TTS_CACHE_MAX_AGE_DAYS", raw)
    monkeypatch.setenv("TTS_MAX_CACHE_BYTES", raw)

    assert (
        audio_cache.max_age_seconds() == audio_cache.DEFAULT_CACHE_MAX_AGE_DAYS * 86400
    )
    assert audio_cache.max_cache_bytes() == audio_cache.DEFAULT_MAX_CACHE_BYTES


# -- Repository hygiene --


def test_generated_audio_is_git_ignored():
    repo_root = Path(__file__).resolve().parents[2]
    result = subprocess.run(
        ["git", "check-ignore", "-q", "backend/.cache/tts/example.mp3"],
        cwd=repo_root,
        check=False,
    )
    assert result.returncode == 0, "backend/.cache/tts/ must be git-ignored"
