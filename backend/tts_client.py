"""ElevenLabs speech synthesis client for GM narration.

Streams MP3 from the ElevenLabs streaming text-to-speech endpoint so the API layer
can relay bytes to the browser as they arrive. Model and voice are resolved from
server configuration only — callers supply the narration text and nothing else (R5).

Errors are redacted on purpose: provider bodies can echo the submitted narration,
so only status codes cross into exception messages and logs (R4).
"""

from __future__ import annotations

import os
import re
from collections.abc import AsyncIterator
from typing import Self

import httpx
from loguru import logger

ELEVENLABS_API_ROOT = "https://api.elevenlabs.io/v1/text-to-speech"

#: Measured against the plan's "first audio within about a second" criterion on the
#: 12-beat corpus: turbo_v2_5 opens at ~0.37s, multilingual_v2 at ~1.4s (and returns
#: the whole clip almost at once, so it never really streams). Turbo also bills at
#: half a credit per character instead of one.
DEFAULT_TTS_MODEL = "eleven_turbo_v2_5"

#: "Bradford" — adult British male storyteller from the ElevenLabs voice library.
#: https://elevenlabs.io/voices/NNl6r8mD7vthiJatiJt1
DEFAULT_TTS_VOICE = "NNl6r8mD7vthiJatiJt1"

#: Pinned rather than operator-tunable: the cache key covers model and voice only
#: (KTD4), so a configurable format could silently serve one bitrate's audio under
#: another's key. 128 kbps mp3 is the provider default and needs no paid tier.
OUTPUT_FORMAT = "mp3_44100_128"

MP3_CONTENT_TYPE = "audio/mpeg"

#: The voice id is interpolated into the request path, so a malformed configuration
#: value could otherwise reach for another endpoint entirely. Library ids are opaque
#: alphanumeric strings; anything else is a configuration error, not a request.
_VOICE_ID_PATTERN = re.compile(r"^[A-Za-z0-9_-]{1,64}$")

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
    """Configured voice id. Server-side only — never client supplied."""
    return (os.getenv("TTS_VOICE") or "").strip() or DEFAULT_TTS_VOICE


def speech_url(voice_id: str) -> str:
    """Streaming endpoint for ``voice_id``.

    Raises ``TtsConfigError`` when the configured id is not a plausible library id.
    """
    if not _VOICE_ID_PATTERN.match(voice_id):
        raise TtsConfigError("TTS_VOICE is not a valid ElevenLabs voice id")
    return f"{ELEVENLABS_API_ROOT}/{voice_id}/stream"


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

    api_key = (os.getenv("ELEVENLABS_API_KEY") or "").strip()
    if not api_key:
        raise TtsConfigError("ELEVENLABS_API_KEY is not set")

    url = speech_url(tts_voice())
    payload = {"text": text, "model_id": tts_model()}

    client = httpx.AsyncClient(transport=transport, timeout=_TIMEOUT)
    try:
        request = client.build_request(
            "POST",
            url,
            json=payload,
            params={"output_format": OUTPUT_FORMAT},
            headers={"xi-api-key": api_key, "accept": MP3_CONTENT_TYPE},
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
