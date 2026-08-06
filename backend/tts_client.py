"""OpenRouter speech synthesis client for GM narration.

Streams MP3 from the OpenRouter speech endpoint (Deepgram Aura-2 by default) so
the API layer can relay bytes to the browser as they arrive. Model and voice are
resolved from server configuration only — callers supply the narration text and
nothing else (R5).

Errors are redacted on purpose: provider bodies can echo the submitted narration,
so only status codes cross into exception messages and logs (R4).
"""

from __future__ import annotations

import os
from collections.abc import AsyncIterator
from typing import Self

import httpx
from loguru import logger

OPENROUTER_SPEECH_URL = "https://openrouter.ai/api/v1/audio/speech"

DEFAULT_TTS_MODEL = "deepgram/aura-2"
DEFAULT_TTS_VOICE = "aura-2-orion-en"

MP3_CONTENT_TYPE = "audio/mpeg"

# Connect/read budgets guard a wedged provider. The overall per-stream ceiling is
# enforced by the API layer (TTS_STREAM_TIMEOUT_SECONDS), not here.
_TIMEOUT = httpx.Timeout(connect=10.0, read=30.0, write=10.0, pool=10.0)


class TtsError(Exception):
    """Base class for narration speech failures."""


class TtsConfigError(TtsError):
    """Server configuration is missing or unusable (e.g. no provider key)."""


class TtsInputError(TtsError):
    """Caller supplied text that can never be synthesized."""


class TtsProviderError(TtsError):
    """The provider refused the request or the transport failed."""


class TtsFormatError(TtsError):
    """The provider answered with something other than MP3."""


def tts_model() -> str:
    """Configured speech model. Server-side only — never client supplied."""
    return (os.getenv("TTS_MODEL") or "").strip() or DEFAULT_TTS_MODEL


def tts_voice() -> str:
    """Configured speech voice. Server-side only — never client supplied."""
    return (os.getenv("TTS_VOICE") or "").strip() or DEFAULT_TTS_VOICE


class SpeechStream:
    """Owned handle over an open provider response.

    The caller must ``aclose()`` it — on success, failure, and cancellation alike —
    so the upstream connection is never left dangling.
    """

    def __init__(self, response: httpx.Response, client: httpx.AsyncClient) -> None:
        self._response = response
        self._client = client
        self._closed = False

    @property
    def closed(self) -> bool:
        return self._closed

    async def iter_bytes(self) -> AsyncIterator[bytes]:
        """Yield provider audio chunks unchanged."""
        async for chunk in self._response.aiter_bytes():
            yield chunk

    async def aclose(self) -> None:
        if self._closed:
            return
        self._closed = True
        try:
            await self._response.aclose()
        finally:
            await self._client.aclose()

    async def __aenter__(self) -> Self:
        return self

    async def __aexit__(self, *_exc_info: object) -> None:
        await self.aclose()


async def open_speech_stream(
    text: str,
    *,
    transport: httpx.AsyncBaseTransport | None = None,
) -> SpeechStream:
    """Open a validated MP3 stream for ``text``.

    ``transport`` exists for tests; it cannot influence model or voice.

    Raises ``TtsInputError``, ``TtsConfigError``, ``TtsProviderError``, or
    ``TtsFormatError``. On any of those the upstream connection is already closed.
    """
    if not text.strip():
        raise TtsInputError("Narration text is empty")

    api_key = (os.getenv("OPENROUTER_API_KEY") or "").strip()
    if not api_key:
        raise TtsConfigError("OPENROUTER_API_KEY is not set")

    payload = {
        "model": tts_model(),
        "voice": tts_voice(),
        "input": text,
        "response_format": "mp3",
    }

    client = httpx.AsyncClient(transport=transport, timeout=_TIMEOUT)
    try:
        request = client.build_request(
            "POST",
            OPENROUTER_SPEECH_URL,
            json=payload,
            headers={"Authorization": f"Bearer {api_key}"},
        )
        response = await client.send(request, stream=True)
    except httpx.HTTPError as exc:
        await client.aclose()
        # Redacted: httpx messages can carry the request URL but never the body.
        logger.warning(f"Narration speech transport failure: {type(exc).__name__}")
        raise TtsProviderError(
            f"Speech provider transport failure: {type(exc).__name__}"
        ) from exc
    except BaseException:
        await client.aclose()
        raise

    stream = SpeechStream(response, client)
    try:
        if response.status_code >= 400:
            logger.warning(f"Narration speech provider returned {response.status_code}")
            raise TtsProviderError(
                f"Speech provider returned status {response.status_code}"
            )

        content_type = response.headers.get("content-type", "").split(";")[0].strip()
        if content_type.lower() != MP3_CONTENT_TYPE:
            logger.warning(f"Narration speech content-type was {content_type!r}")
            raise TtsFormatError(f"Expected {MP3_CONTENT_TYPE}, got {content_type!r}")
    except BaseException:
        await stream.aclose()
        raise

    return stream
