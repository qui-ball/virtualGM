"""Tests for the narration audio API. No test contacts the live provider."""

from __future__ import annotations

import asyncio

import httpx
import pytest
from fastapi.testclient import TestClient

from api import tts as tts_api
from app import app
from tts_client import TtsConfigError, TtsFormatError, TtsProviderError
from utils import audio_cache
from utils.audio_cache import min_plausible_bytes

TEXT = (
    "The lantern gutters and dies. Something large shifts beyond the door, "
    "dragging chain across stone, and the cold reaches your knees."
)
OTHER_TEXT = "Kael steps into the dark, sword low, and counts four heartbeats."


def audio_for(text: str = TEXT) -> bytes:
    return b"\xff\xfb" + b"a" * min_plausible_bytes(text)


@pytest.fixture(autouse=True)
def _isolated_tts(tmp_path, monkeypatch):
    monkeypatch.setenv("TTS_CACHE_DIR", str(tmp_path / "tts"))
    monkeypatch.setenv("OPENROUTER_API_KEY", "test-key")
    monkeypatch.setenv("TTS_MODEL", "deepgram/aura-2")
    monkeypatch.setenv("TTS_VOICE", "aura-2-orion-en")
    for name in (
        "TTS_CACHE_MAX_AGE_DAYS",
        "TTS_MAX_CACHE_BYTES",
        "TTS_MAX_INPUT_CHARS",
        "TTS_MAX_CALLS_PER_MINUTE",
        "TTS_MAX_CALLS_PER_HOUR",
        "TTS_MAX_STREAM_BYTES",
        "TTS_STREAM_TIMEOUT_SECONDS",
    ):
        monkeypatch.delenv(name, raising=False)
    tts_api.reset_narration_audio_state()
    yield
    tts_api.reset_narration_audio_state()


class FakeStream:
    """Stands in for `tts_client.SpeechStream`."""

    def __init__(self, chunks, *, error=None, gap=0.0):
        self._chunks = chunks
        self._error = error
        self._gap = gap
        self.closed = False

    async def iter_bytes(self):
        for index, chunk in enumerate(self._chunks):
            if index and self._gap:
                await asyncio.sleep(self._gap)
            yield chunk
        if self._error is not None:
            raise self._error

    async def aclose(self):
        self.closed = True


class FakeProvider:
    """Records calls and hands out `FakeStream`s."""

    def __init__(self, monkeypatch, factory=None, raises=None):
        self.calls: list[str] = []
        self.streams: list[FakeStream] = []
        self._factory = factory or (lambda text: FakeStream([audio_for(text)]))
        self._raises = raises
        monkeypatch.setattr(tts_api, "open_speech_stream", self._open)

    async def _open(self, text: str):
        self.calls.append(text)
        if self._raises is not None:
            raise self._raises
        stream = self._factory(text)
        self.streams.append(stream)
        return stream


@pytest.fixture
def client():
    with TestClient(app) as test_client:
        yield test_client


def register(client, text=TEXT) -> str:
    response = client.post("/narration-audio", json={"text": text})
    assert response.status_code == 200, response.text
    return response.json()["audio_id"]


def cache_files(suffix=".mp3") -> list[str]:
    directory = audio_cache.cache_dir()
    return sorted(p.name for p in directory.iterdir() if p.name.endswith(suffix))


# -- Registration --


def test_registration_makes_no_provider_call(client, monkeypatch):
    provider = FakeProvider(monkeypatch)

    audio_id = register(client)

    assert audio_id
    assert provider.calls == []
    assert cache_files() == []


def test_identical_text_and_config_returns_the_same_id(client):
    assert register(client) == register(client)


def test_changing_model_or_voice_changes_the_id(client, monkeypatch):
    baseline = register(client)

    monkeypatch.setenv("TTS_MODEL", "deepgram/aura-2-other")
    assert register(client) != baseline

    monkeypatch.setenv("TTS_MODEL", "deepgram/aura-2")
    monkeypatch.setenv("TTS_VOICE", "aura-2-thalia-en")
    assert register(client) != baseline


def test_different_text_returns_a_different_id(client):
    assert register(client, TEXT) != register(client, OTHER_TEXT)


@pytest.mark.parametrize(
    "payload",
    [
        {"text": TEXT, "model": "evil/model"},
        {"text": TEXT, "voice": "evil-voice"},
    ],
)
def test_client_supplied_model_or_voice_is_rejected(client, monkeypatch, payload):
    provider = FakeProvider(monkeypatch)

    response = client.post("/narration-audio", json=payload)

    assert response.status_code == 422
    assert provider.calls == []


@pytest.mark.parametrize("text", ["", "   ", "\n\t "])
def test_blank_text_is_rejected_without_provider_contact(client, monkeypatch, text):
    provider = FakeProvider(monkeypatch)

    response = client.post("/narration-audio", json={"text": text})

    assert response.status_code == 400
    assert provider.calls == []


def test_overlong_text_is_rejected_without_provider_contact(client, monkeypatch):
    provider = FakeProvider(monkeypatch)

    response = client.post("/narration-audio", json={"text": "x" * 2001})

    assert response.status_code == 400
    assert provider.calls == []
    assert client.post("/narration-audio", json={"text": "x" * 2000}).status_code == 200


def test_registry_evicts_oldest_first(client, monkeypatch):
    monkeypatch.setattr(tts_api, "REGISTRY_MAX_ENTRIES", 2)
    FakeProvider(monkeypatch)

    first = register(client, "alpha narration")
    register(client, "beta narration")
    register(client, "gamma narration")

    assert client.get(f"/narration-audio/{first}").status_code == 404


# -- Playback --


def test_unknown_id_returns_404_without_provider_contact(client, monkeypatch):
    provider = FakeProvider(monkeypatch)

    assert client.get("/narration-audio/deadbeef").status_code == 404
    assert provider.calls == []


def test_cache_miss_streams_mp3_and_caches_it(client, monkeypatch):
    provider = FakeProvider(monkeypatch)
    audio_id = register(client)

    response = client.get(f"/narration-audio/{audio_id}")

    assert response.status_code == 200
    assert response.headers["content-type"].startswith("audio/mpeg")
    assert response.content == audio_for()
    assert provider.calls == [TEXT]
    assert cache_files() == [f"{audio_id}.mp3"]
    assert provider.streams[0].closed


def test_retained_cache_replay_makes_no_second_provider_call(client, monkeypatch):
    provider = FakeProvider(monkeypatch)
    audio_id = register(client)

    first = client.get(f"/narration-audio/{audio_id}")
    second = client.get(f"/narration-audio/{audio_id}")

    assert first.content == second.content == audio_for()
    assert provider.calls == [TEXT]


def test_eviction_regenerates(client, monkeypatch):
    provider = FakeProvider(monkeypatch)
    audio_id = register(client)
    client.get(f"/narration-audio/{audio_id}")

    (audio_cache.cache_dir() / f"{audio_id}.mp3").unlink()

    assert client.get(f"/narration-audio/{audio_id}").content == audio_for()
    assert provider.calls == [TEXT, TEXT]


def test_short_output_streams_but_is_not_cached(client, monkeypatch):
    tiny = b"\xff\xfb short"
    provider = FakeProvider(monkeypatch, factory=lambda text: FakeStream([tiny]))
    audio_id = register(client)

    response = client.get(f"/narration-audio/{audio_id}")

    assert response.status_code == 200
    assert response.content == tiny
    assert cache_files() == []
    assert cache_files(".part") == []

    client.get(f"/narration-audio/{audio_id}")
    assert provider.calls == [TEXT, TEXT]


# -- Provider setup failures --


@pytest.mark.parametrize(
    "error",
    [
        TtsProviderError("provider returned status 500"),
        TtsFormatError("expected audio/mpeg"),
        TtsConfigError("OPENROUTER_API_KEY is not set"),
    ],
)
def test_provider_setup_errors_become_502_before_streaming(client, monkeypatch, error):
    FakeProvider(monkeypatch, raises=error)
    audio_id = register(client)

    response = client.get(f"/narration-audio/{audio_id}")

    assert response.status_code == 502
    assert cache_files() == []
    assert cache_files(".part") == []


def test_502_body_does_not_echo_narration(client, monkeypatch):
    FakeProvider(monkeypatch, raises=TtsProviderError(f"upstream said {TEXT}"))
    audio_id = register(client)

    response = client.get(f"/narration-audio/{audio_id}")

    assert TEXT not in response.text


# -- Mid-stream failures --


def test_mid_stream_failure_closes_upstream_and_leaves_no_cache_file(
    client, monkeypatch
):
    provider = FakeProvider(
        monkeypatch,
        factory=lambda text: FakeStream(
            [b"\xff\xfb" + b"a" * 64], error=httpx.ReadError("stream died")
        ),
    )
    audio_id = register(client)

    with pytest.raises(httpx.ReadError):
        client.get(f"/narration-audio/{audio_id}")

    assert provider.streams[0].closed
    assert cache_files() == []
    assert cache_files(".part") == []


def test_oversize_stream_stops_and_leaves_no_cache_file(client, monkeypatch):
    monkeypatch.setenv("TTS_MAX_STREAM_BYTES", "64")
    provider = FakeProvider(
        monkeypatch, factory=lambda text: FakeStream([b"a" * 40, b"b" * 40, b"c" * 40])
    )
    audio_id = register(client)

    response = client.get(f"/narration-audio/{audio_id}")

    assert len(response.content) <= 64
    assert provider.streams[0].closed
    assert cache_files() == []
    assert cache_files(".part") == []


def test_timeout_stops_and_leaves_no_cache_file(client, monkeypatch):
    monkeypatch.setenv("TTS_STREAM_TIMEOUT_SECONDS", "0.01")
    provider = FakeProvider(
        monkeypatch,
        factory=lambda text: FakeStream([b"\xff\xfb" + b"a" * 32] * 3, gap=0.05),
    )
    audio_id = register(client)

    response = client.get(f"/narration-audio/{audio_id}")

    assert response.status_code == 200
    assert len(response.content) < len(audio_for())
    assert provider.streams[0].closed
    assert cache_files() == []
    assert cache_files(".part") == []


# -- Rate limits --


def test_rate_limit_returns_429(client, monkeypatch):
    monkeypatch.setenv("TTS_MAX_CALLS_PER_MINUTE", "1")
    provider = FakeProvider(monkeypatch)
    first = register(client, TEXT)
    second = register(client, OTHER_TEXT)

    assert client.get(f"/narration-audio/{first}").status_code == 200
    assert client.get(f"/narration-audio/{second}").status_code == 429
    assert provider.calls == [TEXT]


def test_hourly_rate_limit_returns_429(client, monkeypatch):
    monkeypatch.setenv("TTS_MAX_CALLS_PER_HOUR", "1")
    FakeProvider(monkeypatch)
    first = register(client, TEXT)
    second = register(client, OTHER_TEXT)

    assert client.get(f"/narration-audio/{first}").status_code == 200
    assert client.get(f"/narration-audio/{second}").status_code == 429


def test_cache_hits_do_not_consume_rate_limit_capacity(client, monkeypatch):
    monkeypatch.setenv("TTS_MAX_CALLS_PER_MINUTE", "1")
    provider = FakeProvider(monkeypatch)
    audio_id = register(client)

    for _ in range(4):
        assert client.get(f"/narration-audio/{audio_id}").status_code == 200

    assert provider.calls == [TEXT]


def test_rate_limited_request_does_not_touch_the_cache(client, monkeypatch):
    monkeypatch.setenv("TTS_MAX_CALLS_PER_MINUTE", "1")
    FakeProvider(monkeypatch)
    first = register(client, TEXT)
    second = register(client, OTHER_TEXT)
    client.get(f"/narration-audio/{first}")

    client.get(f"/narration-audio/{second}")

    assert cache_files() == [f"{first}.mp3"]


# -- Concurrency and disconnect (direct ASGI) --


def test_two_simultaneous_cold_gets_never_expose_a_partial_cache_file(monkeypatch):
    provider = FakeProvider(
        monkeypatch,
        factory=lambda text: FakeStream(
            [b"\xff\xfb" + b"a" * (min_plausible_bytes(text) // 2 + 8)] * 2, gap=0.02
        ),
    )

    async def run():
        transport = httpx.ASGITransport(app=app)
        async with httpx.AsyncClient(
            transport=transport, base_url="http://testserver"
        ) as async_client:
            registered = await async_client.post("/narration-audio", json={"text": TEXT})
            audio_id = registered.json()["audio_id"]
            return audio_id, await asyncio.gather(
                async_client.get(f"/narration-audio/{audio_id}"),
                async_client.get(f"/narration-audio/{audio_id}"),
            )

    audio_id, responses = asyncio.run(run())

    assert [r.status_code for r in responses] == [200, 200]
    expected = b"".join([b"\xff\xfb" + b"a" * (min_plausible_bytes(TEXT) // 2 + 8)] * 2)
    assert [r.content for r in responses] == [expected, expected]
    assert len(provider.calls) == 2
    assert all(stream.closed for stream in provider.streams)
    assert cache_files() == [f"{audio_id}.mp3"]
    assert cache_files(".part") == []
    assert (audio_cache.cache_dir() / f"{audio_id}.mp3").read_bytes() == expected


def test_client_disconnect_closes_upstream_and_leaves_no_cache_file(monkeypatch):
    """Drives the ASGI app directly — TestClient cannot hang up mid-body."""
    provider = FakeProvider(
        monkeypatch,
        factory=lambda text: FakeStream([b"\xff\xfb" + b"a" * 64] * 20, gap=0.01),
    )

    async def run():
        transport = httpx.ASGITransport(app=app)
        async with httpx.AsyncClient(
            transport=transport, base_url="http://testserver"
        ) as async_client:
            registered = await async_client.post("/narration-audio", json={"text": TEXT})
            audio_id = registered.json()["audio_id"]

        received: list[bytes] = []
        first_chunk = asyncio.Event()
        disconnected = asyncio.Event()

        async def receive():
            # Hang up as soon as real audio has reached the "browser".
            await first_chunk.wait()
            disconnected.set()
            return {"type": "http.disconnect"}

        async def send(message):
            if message["type"] == "http.response.body" and message.get("body"):
                received.append(message["body"])
                first_chunk.set()

        scope = {
            "type": "http",
            "asgi": {"version": "3.0", "spec_version": "2.3"},
            "http_version": "1.1",
            "method": "GET",
            "scheme": "http",
            "path": f"/narration-audio/{audio_id}",
            "raw_path": f"/narration-audio/{audio_id}".encode(),
            "query_string": b"",
            "root_path": "",
            "headers": [(b"host", b"testserver")],
            "client": ("127.0.0.1", 4321),
            "server": ("testserver", 80),
        }
        await app(scope, receive, send)
        assert disconnected.is_set()
        return received

    received = asyncio.run(run())

    assert received  # some audio reached the client before hangup
    assert len(received) < 20
    assert provider.streams[0].closed
    assert cache_files() == []
    assert cache_files(".part") == []
