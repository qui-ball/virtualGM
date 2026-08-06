"""Tests for the OpenRouter speech client. Mocked transport only — no live network."""

from __future__ import annotations

import asyncio
import inspect
import json

import httpx
import pytest

from tts_client import (
    OPENROUTER_SPEECH_URL,
    TtsConfigError,
    TtsFormatError,
    TtsInputError,
    TtsProviderError,
    open_speech_stream,
    tts_model,
    tts_voice,
)

TEXT = "The lantern gutters. Something large shifts beyond the door."
MP3_CHUNKS = [b"\xff\xfb\x90d", b"first-audio-frame", b"second-audio-frame"]


@pytest.fixture(autouse=True)
def _server_config(monkeypatch):
    monkeypatch.setenv("OPENROUTER_API_KEY", "test-key")
    monkeypatch.setenv("TTS_MODEL", "deepgram/aura-2")
    monkeypatch.setenv("TTS_VOICE", "aura-2-orion-en")


class _TrackedStream(httpx.AsyncByteStream):
    """Stands in for the real upstream body so `aclose` is observable."""

    def __init__(self, chunks=MP3_CHUNKS, *, closed=None, error=None):
        self._chunks = chunks
        self._closed = closed if closed is not None else []
        self._error = error

    async def __aiter__(self):
        for chunk in self._chunks:
            yield chunk
            if self._error is not None:
                raise self._error

    async def aclose(self) -> None:
        self._closed.append(True)


def _mp3_response(**kwargs):
    return httpx.Response(
        200, headers={"content-type": "audio/mpeg"}, stream=_TrackedStream(**kwargs)
    )


def _transport(handler):
    return httpx.MockTransport(handler)


def _capturing_transport(response_factory):
    seen: list[httpx.Request] = []

    def handler(request: httpx.Request) -> httpx.Response:
        seen.append(request)
        return response_factory()

    return _transport(handler), seen


# -- Request shape --


def test_posts_bearer_key_model_and_voice_to_openrouter():
    transport, seen = _capturing_transport(_mp3_response)

    async def run():
        stream = await open_speech_stream(TEXT, transport=transport)
        await stream.aclose()

    asyncio.run(run())

    assert len(seen) == 1
    request = seen[0]
    assert request.method == "POST"
    assert str(request.url) == OPENROUTER_SPEECH_URL
    assert request.headers["authorization"] == "Bearer test-key"
    assert json.loads(request.content) == {
        "model": "deepgram/aura-2",
        "voice": "aura-2-orion-en",
        "input": TEXT,
        "response_format": "mp3",
    }


def test_model_and_voice_come_from_server_config(monkeypatch):
    monkeypatch.setenv("TTS_MODEL", "deepgram/aura-2-other")
    monkeypatch.setenv("TTS_VOICE", "aura-2-thalia-en")
    transport, seen = _capturing_transport(_mp3_response)

    async def run():
        stream = await open_speech_stream(TEXT, transport=transport)
        await stream.aclose()

    asyncio.run(run())

    payload = json.loads(seen[0].content)
    assert payload["model"] == "deepgram/aura-2-other" == tts_model()
    assert payload["voice"] == "aura-2-thalia-en" == tts_voice()


def test_caller_cannot_override_model_or_voice():
    """R5: the only caller-supplied value is the text itself."""
    params = inspect.signature(open_speech_stream).parameters
    assert list(params) == ["text", "transport"]
    assert params["transport"].kind is inspect.Parameter.KEYWORD_ONLY

    transport, _ = _capturing_transport(_mp3_response)
    with pytest.raises(TypeError):
        asyncio.run(
            open_speech_stream(  # type: ignore[call-arg]
                TEXT, model="evil/model", voice="evil-voice", transport=transport
            )
        )


# -- Streaming --


def test_chunks_pass_through_unchanged():
    transport, _ = _capturing_transport(_mp3_response)

    async def run():
        stream = await open_speech_stream(TEXT, transport=transport)
        try:
            return [chunk async for chunk in stream.iter_bytes()]
        finally:
            await stream.aclose()

    assert asyncio.run(run()) == MP3_CHUNKS


# -- Typed failures --


def test_missing_key_raises_config_error(monkeypatch):
    monkeypatch.delenv("OPENROUTER_API_KEY", raising=False)
    transport, seen = _capturing_transport(_mp3_response)

    with pytest.raises(TtsConfigError):
        asyncio.run(open_speech_stream(TEXT, transport=transport))
    assert seen == []


def test_blank_text_raises_input_error():
    transport, seen = _capturing_transport(_mp3_response)

    with pytest.raises(TtsInputError):
        asyncio.run(open_speech_stream("   ", transport=transport))
    assert seen == []


@pytest.mark.parametrize("status", [401, 429, 500])
def test_non_200_raises_provider_error_without_echoing_body(status):
    secret_body = b"upstream said: " + TEXT.encode()

    def handler(request: httpx.Request) -> httpx.Response:
        return httpx.Response(
            status, headers={"content-type": "application/json"}, content=secret_body
        )

    with pytest.raises(TtsProviderError) as excinfo:
        asyncio.run(open_speech_stream(TEXT, transport=_transport(handler)))

    message = str(excinfo.value)
    assert str(status) in message
    assert TEXT not in message
    assert "test-key" not in message


def test_non_mp3_content_type_raises_format_error():
    def handler(request: httpx.Request) -> httpx.Response:
        return httpx.Response(
            200, headers={"content-type": "application/json"}, content=b'{"ok":true}'
        )

    with pytest.raises(TtsFormatError):
        asyncio.run(open_speech_stream(TEXT, transport=_transport(handler)))


def test_provider_transport_failure_raises_provider_error():
    def handler(request: httpx.Request) -> httpx.Response:
        raise httpx.ConnectError("boom", request=request)

    with pytest.raises(TtsProviderError):
        asyncio.run(open_speech_stream(TEXT, transport=_transport(handler)))


# -- Handle ownership --


def test_handle_closes_after_completion():
    upstream_closed: list[bool] = []
    transport, _ = _capturing_transport(lambda: _mp3_response(closed=upstream_closed))

    async def run():
        stream = await open_speech_stream(TEXT, transport=transport)
        async for _ in stream.iter_bytes():
            pass
        await stream.aclose()
        return stream

    stream = asyncio.run(run())
    assert stream.closed
    assert upstream_closed == [True]


def test_handle_closes_after_mid_stream_failure():
    upstream_closed: list[bool] = []
    transport, _ = _capturing_transport(
        lambda: _mp3_response(
            chunks=MP3_CHUNKS[:1],
            closed=upstream_closed,
            error=httpx.ReadError("stream died"),
        )
    )

    async def run():
        stream = await open_speech_stream(TEXT, transport=transport)
        try:
            with pytest.raises(httpx.ReadError):
                async for _ in stream.iter_bytes():
                    pass
        finally:
            await stream.aclose()
        return stream

    stream = asyncio.run(run())
    assert stream.closed
    assert upstream_closed == [True]


def test_handle_closes_after_cancellation():
    upstream_closed: list[bool] = []
    transport, _ = _capturing_transport(lambda: _mp3_response(closed=upstream_closed))

    async def run():
        stream = await open_speech_stream(TEXT, transport=transport)
        started = asyncio.Event()

        async def drain():
            async for _ in stream.iter_bytes():
                started.set()
                await asyncio.sleep(3600)

        task = asyncio.create_task(drain())
        await started.wait()
        task.cancel()
        with pytest.raises(asyncio.CancelledError):
            await task
        await stream.aclose()
        return stream

    stream = asyncio.run(run())
    assert stream.closed
    assert upstream_closed == [True]


def test_aclose_is_idempotent():
    transport, _ = _capturing_transport(_mp3_response)

    async def run():
        stream = await open_speech_stream(TEXT, transport=transport)
        await stream.aclose()
        await stream.aclose()
        return stream

    assert asyncio.run(run()).closed


def test_async_context_manager_closes_on_exit():
    transport, _ = _capturing_transport(_mp3_response)

    async def run():
        async with await open_speech_stream(TEXT, transport=transport) as stream:
            assert not stream.closed
        return stream

    assert asyncio.run(run()).closed
