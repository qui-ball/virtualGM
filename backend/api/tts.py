"""Narration audio API — register text, then stream it back as MP3.

Two endpoints because an ``<audio>`` element cannot POST and narration does not
belong in a query string (KTD2):

1. ``POST /narration-audio`` records the exact displayed text against a content id
   derived from that text plus the configured model and voice. No synthesis yet.
2. ``GET /narration-audio/{id}`` serves a completed cache hit, or opens one
   independent provider stream and relays it while writing the cache entry.

Text is resolved from this registry rather than transcript ids, whose client and
backend id spaces differ (KTD3).

Scope: this router is unauthenticated and spends money, like the rest of the
backend today. The per-process limits below blunt accidental local/LAN abuse; they
are not a public-deployment security boundary.
"""

from __future__ import annotations

import os
import threading
import time
from collections import OrderedDict, deque
from collections.abc import AsyncIterator
from dataclasses import dataclass

from fastapi import APIRouter, HTTPException
from fastapi.responses import FileResponse, StreamingResponse
from loguru import logger

from api.schemas import NarrationAudioRequest, NarrationAudioResponse
from tts_client import TtsError, open_speech_stream, tts_model, tts_voice
from utils.audio_cache import cache_key, cleanup, get_cached_path, open_writer

router = APIRouter(tags=["narration-audio"])

MP3_MEDIA_TYPE = "audio/mpeg"

DEFAULT_MAX_INPUT_CHARS = 2000
DEFAULT_MAX_CALLS_PER_MINUTE = 20
DEFAULT_MAX_CALLS_PER_HOUR = 120
DEFAULT_MAX_STREAM_BYTES = 5 * 1024 * 1024  # 5 MiB
DEFAULT_STREAM_TIMEOUT_SECONDS = 180.0

#: Registered narrations kept in memory. Bounded so a long session cannot grow it
#: without limit; eviction only costs the player one extra registration round-trip.
REGISTRY_MAX_ENTRIES = 512


def _positive_env(name: str, default: float) -> float:
    raw = (os.getenv(name) or "").strip()
    if not raw:
        return default
    try:
        value = float(raw)
    except ValueError:
        logger.warning(f"{name} is not numeric; using default {default}")
        return default
    return value if value > 0 else default


def max_input_chars() -> int:
    return int(_positive_env("TTS_MAX_INPUT_CHARS", DEFAULT_MAX_INPUT_CHARS))


def max_stream_bytes() -> int:
    return int(_positive_env("TTS_MAX_STREAM_BYTES", DEFAULT_MAX_STREAM_BYTES))


def stream_timeout_seconds() -> float:
    return _positive_env("TTS_STREAM_TIMEOUT_SECONDS", DEFAULT_STREAM_TIMEOUT_SECONDS)


@dataclass(frozen=True)
class RegisteredNarration:
    """Exactly what the provider will be asked to speak, frozen at registration."""

    text: str
    model: str
    voice: str


class _NarrationRegistry:
    """Bounded, oldest-first store of registered narration text."""

    def __init__(self) -> None:
        self._entries: OrderedDict[str, RegisteredNarration] = OrderedDict()
        self._lock = threading.Lock()

    def add(self, content_id: str, entry: RegisteredNarration) -> None:
        with self._lock:
            self._entries.pop(content_id, None)
            self._entries[content_id] = entry
            while len(self._entries) > REGISTRY_MAX_ENTRIES:
                self._entries.popitem(last=False)

    def get(self, content_id: str) -> RegisteredNarration | None:
        with self._lock:
            entry = self._entries.get(content_id)
            if entry is not None:
                # Keep a narration someone is actively replaying away from the tail.
                self._entries.move_to_end(content_id)
            return entry

    def clear(self) -> None:
        with self._lock:
            self._entries.clear()


class _CallRateLimiter:
    """Process-local minute/hour budget for provider calls.

    ``reserve`` takes both windows or neither, so a request that is about to be
    refused by the hour budget does not silently burn minute capacity.
    """

    def __init__(self) -> None:
        self._minute: deque[float] = deque()
        self._hour: deque[float] = deque()
        self._lock = threading.Lock()

    def reserve(self) -> bool:
        now = time.monotonic()
        minute_cap = int(
            _positive_env("TTS_MAX_CALLS_PER_MINUTE", DEFAULT_MAX_CALLS_PER_MINUTE)
        )
        hour_cap = int(
            _positive_env("TTS_MAX_CALLS_PER_HOUR", DEFAULT_MAX_CALLS_PER_HOUR)
        )
        with self._lock:
            _drop_before(self._minute, now - 60)
            _drop_before(self._hour, now - 3600)
            if len(self._minute) >= minute_cap or len(self._hour) >= hour_cap:
                return False
            self._minute.append(now)
            self._hour.append(now)
            return True

    def clear(self) -> None:
        with self._lock:
            self._minute.clear()
            self._hour.clear()


def _drop_before(window: deque[float], cutoff: float) -> None:
    while window and window[0] <= cutoff:
        window.popleft()


_registry = _NarrationRegistry()
_rate_limiter = _CallRateLimiter()


def reset_narration_audio_state() -> None:
    """Clear process-local registry and rate-limit state (tests)."""
    _registry.clear()
    _rate_limiter.clear()


@router.post("/narration-audio", response_model=NarrationAudioResponse)
def register_narration_audio(body: NarrationAudioRequest) -> NarrationAudioResponse:
    """Record narration text and return its content id. Never calls the provider."""
    text = body.text
    if not text.strip():
        raise HTTPException(status_code=400, detail="Narration text is empty")

    limit = max_input_chars()
    if len(text) > limit:
        raise HTTPException(
            status_code=400, detail=f"Narration text exceeds {limit} characters"
        )

    model, voice = tts_model(), tts_voice()
    content_id = cache_key(text, model, voice)
    _registry.add(content_id, RegisteredNarration(text=text, model=model, voice=voice))
    return NarrationAudioResponse(audio_id=content_id)


@router.get("/narration-audio/{content_id}")
async def stream_narration_audio(content_id: str):
    """Serve a cache hit, or open and relay exactly one provider stream."""
    cached = get_cached_path(content_id)
    if cached is not None:
        return FileResponse(cached, media_type=MP3_MEDIA_TYPE)

    entry = _registry.get(content_id)
    if entry is None:
        raise HTTPException(status_code=404, detail="Unknown narration audio id")

    if not _rate_limiter.reserve():
        raise HTTPException(
            status_code=429, detail="Narration audio rate limit reached; try again soon"
        )

    try:
        # Opened here, not inside the generator, so setup failures can still become
        # a 502 instead of a truncated 200 body.
        stream = await open_speech_stream(entry.text)
    except TtsError as exc:
        logger.warning(f"Narration audio unavailable: {type(exc).__name__}")
        raise HTTPException(
            status_code=502, detail="Narration speech provider unavailable"
        ) from exc

    return StreamingResponse(
        _relay(stream, content_id, entry.text), media_type=MP3_MEDIA_TYPE
    )


async def _relay(stream, content_id: str, text: str) -> AsyncIterator[bytes]:
    """Relay provider bytes to the browser while writing the cache entry.

    Every unsuccessful path — failure, disconnect, timeout, oversize — abandons the
    temp file and closes the provider handle, so no partial entry is ever published.
    """
    deadline = time.monotonic() + stream_timeout_seconds()
    size_cap = max_stream_bytes()
    writer = open_writer(content_id, text)
    total = 0
    committed = False
    published = None

    try:
        async for chunk in stream.iter_bytes():
            if time.monotonic() > deadline:
                logger.warning("Narration audio stream exceeded its time budget")
                break
            total += len(chunk)
            if total > size_cap:
                logger.warning("Narration audio stream exceeded its size budget")
                break
            writer.write(chunk)
            yield chunk
        else:
            published = writer.commit()
            committed = True
    finally:
        if not committed:
            writer.abandon()
        await stream.aclose()

    if published is not None:
        _cleanup_quietly()


def _cleanup_quietly() -> None:
    try:
        cleanup()
    except OSError as exc:
        logger.warning(f"Narration audio cache cleanup skipped: {exc}")
