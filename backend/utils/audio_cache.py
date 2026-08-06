"""Best-effort filesystem cache for synthesized narration audio.

Entries are keyed by SHA-256 of the narration text plus the configured model and
voice (KTD4), so changing either configuration value naturally invalidates every
prior entry.

Writes go to a unique temporary file and are published with an atomic rename
(KTD5), which keeps a partially-written stream from ever being served as a hit.
Nothing here coordinates concurrent cold requests — two simultaneous misses each
own their own temp file and the last one to finish wins.

Scope: local, best-effort, single-process. Age and size cleanup are targets, not
quotas — see the plan's accepted MVP risks.
"""

from __future__ import annotations

import hashlib
import os
import tempfile
import time
from pathlib import Path
from types import TracebackType
from typing import Self

from loguru import logger

from utils.env_config import positive_int

#: Rough MP3 bytes produced per character of narration at the configured bitrate.
BYTES_PER_CHARACTER = 375

#: Output below this fraction of the estimate is treated as implausible (R9).
MIN_PLAUSIBLE_FRACTION = 0.3

DEFAULT_CACHE_MAX_AGE_DAYS = 7
DEFAULT_MAX_CACHE_BYTES = 100 * 1024 * 1024  # 100 MiB

_DEFAULT_CACHE_DIR = Path(__file__).resolve().parent.parent / ".cache" / "tts"

_ENTRY_SUFFIX = ".mp3"
_TEMP_SUFFIX = ".part"

_DIR_MODE = 0o700
_FILE_MODE = 0o600


def cache_dir() -> Path:
    """Cache directory, created on demand with owner-only permissions."""
    configured = (os.getenv("TTS_CACHE_DIR") or "").strip()
    path = Path(configured) if configured else _DEFAULT_CACHE_DIR
    path.mkdir(parents=True, exist_ok=True, mode=_DIR_MODE)
    # `mode` only applies when mkdir creates the directory, and umask can shave
    # bits off even then, so tighten unconditionally.
    path.chmod(_DIR_MODE)
    return path


def max_age_seconds() -> int:
    return positive_int("TTS_CACHE_MAX_AGE_DAYS", DEFAULT_CACHE_MAX_AGE_DAYS) * 86400


def max_cache_bytes() -> int:
    return positive_int("TTS_MAX_CACHE_BYTES", DEFAULT_MAX_CACHE_BYTES)


def cache_key(text: str, model: str, voice: str) -> str:
    """SHA-256 over the exact text plus the configured model and voice."""
    digest = hashlib.sha256()
    # Length-prefixed so ("ab", "c") and ("a", "bc") cannot collide.
    for field in (text, model, voice):
        encoded = field.encode("utf-8")
        digest.update(str(len(encoded)).encode("ascii"))
        digest.update(b"\0")
        digest.update(encoded)
    return digest.hexdigest()


def min_plausible_bytes(text: str) -> int:
    """Smallest output size we are willing to treat as real audio for ``text``."""
    return int(len(text) * BYTES_PER_CHARACTER * MIN_PLAUSIBLE_FRACTION)


def get_cached_path(key: str) -> Path | None:
    """Return the completed entry for ``key``, or ``None`` on a miss."""
    path = cache_dir() / f"{key}{_ENTRY_SUFFIX}"
    return path if path.is_file() else None


class CacheWriter:
    """A single cache-miss write. Owns one temp file until commit or abandon."""

    def __init__(self, key: str, text: str) -> None:
        self._key = key
        self._directory = cache_dir()
        self._min_bytes = min_plausible_bytes(text)
        self._written = 0
        self._finished = False

        handle, temp_name = tempfile.mkstemp(
            dir=self._directory, prefix=f"{key}.", suffix=_TEMP_SUFFIX
        )
        self.temp_path = Path(temp_name)
        os.chmod(self.temp_path, _FILE_MODE)
        self._file = os.fdopen(handle, "wb")

    @property
    def key(self) -> str:
        return self._key

    @property
    def bytes_written(self) -> int:
        return self._written

    def write(self, chunk: bytes) -> None:
        if self._finished:
            raise RuntimeError("CacheWriter is already finished")
        self._file.write(chunk)
        self._written += len(chunk)

    def commit(self) -> Path | None:
        """Publish atomically. Returns ``None`` when output was implausibly short."""
        if self._finished:
            raise RuntimeError("CacheWriter is already finished")
        self._finished = True
        self._file.close()

        if self._written < self._min_bytes:
            logger.debug(
                f"Narration audio too short to cache "
                f"({self._written} < {self._min_bytes} bytes)"
            )
            self._unlink_temp()
            return None

        final = self._directory / f"{self._key}{_ENTRY_SUFFIX}"
        os.replace(self.temp_path, final)
        return final

    def abandon(self) -> None:
        """Drop the in-progress write. Safe to call more than once."""
        if not self._finished:
            self._finished = True
            self._file.close()
        self._unlink_temp()

    def _unlink_temp(self) -> None:
        self.temp_path.unlink(missing_ok=True)

    def __enter__(self) -> Self:
        return self

    def __exit__(
        self,
        exc_type: type[BaseException] | None,
        exc: BaseException | None,
        traceback: TracebackType | None,
    ) -> None:
        if not self._finished:
            self.abandon()


def open_writer(key: str, text: str) -> CacheWriter:
    return CacheWriter(key, text)


def cleanup() -> None:
    """Drop entries past the age limit, then trim oldest-first toward the size cap.

    Best effort: a file another process removed underneath us is not an error.
    """
    directory = cache_dir()
    entries: list[tuple[float, int, Path]] = []
    cutoff = time.time() - max_age_seconds()

    for path in directory.glob(f"*{_ENTRY_SUFFIX}"):
        try:
            info = path.stat()
        except OSError:
            continue
        if info.st_mtime < cutoff:
            path.unlink(missing_ok=True)
            continue
        entries.append((info.st_mtime, info.st_size, path))

    budget = max_cache_bytes()
    total = sum(size for _, size, _ in entries)
    if total <= budget:
        return

    for _, size, path in sorted(entries):
        if total <= budget:
            break
        path.unlink(missing_ok=True)
        total -= size


def cleanup_quietly() -> None:
    """Cleanup that must never take down the app or a request."""
    try:
        cleanup()
    except OSError as exc:
        logger.warning(f"Narration audio cache cleanup skipped: {exc}")
