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

import asyncio
import re
import threading
import time
from collections import OrderedDict, deque
from collections.abc import AsyncIterator
from dataclasses import dataclass, field

from fastapi import APIRouter, HTTPException
from fastapi.responses import FileResponse, StreamingResponse
from loguru import logger

from api.schemas import NarrationAudioRequest, NarrationAudioResponse
from tts_client import TtsError, open_speech_stream, tts_model, tts_voice
from utils.audio_cache import (
    CacheWriter,
    cache_key,
    cleanup_quietly,
    get_cached_path,
    open_writer,
)
from utils.env_config import positive_int, positive_number

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

#: Content ids index the cache directory by filename. Routing already keeps path
#: separators out of a single segment, but pinning the id to the exact SHA-256 shape
#: `cache_key` produces keeps that safety local to this module instead of resting on
#: the router's segment semantics.
_CONTENT_ID_PATTERN = re.compile(r"^[0-9a-f]{64}$")


def max_input_chars() -> int:
    return positive_int("TTS_MAX_INPUT_CHARS", DEFAULT_MAX_INPUT_CHARS)


def max_stream_bytes() -> int:
    return positive_int("TTS_MAX_STREAM_BYTES", DEFAULT_MAX_STREAM_BYTES)


def stream_timeout_seconds() -> float:
    return positive_number("TTS_STREAM_TIMEOUT_SECONDS", DEFAULT_STREAM_TIMEOUT_SECONDS)


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
        minute_cap = positive_int(
            "TTS_MAX_CALLS_PER_MINUTE", DEFAULT_MAX_CALLS_PER_MINUTE
        )
        hour_cap = positive_int("TTS_MAX_CALLS_PER_HOUR", DEFAULT_MAX_CALLS_PER_HOUR)
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
    if not _CONTENT_ID_PATTERN.match(content_id):
        raise HTTPException(status_code=404, detail="Unknown narration audio id")

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

    queue = _start_download(stream, content_id, entry.text)
    return StreamingResponse(_relay(queue), media_type=MP3_MEDIA_TYPE)


#: Sentinel closing a download's chunk queue.
_END = object()

#: In-flight downloads. Held in a module-level set because a bare `create_task`
#: reference is weak — the loop could otherwise collect one mid-download and
#: silently lose the cache write.
_downloads: set[asyncio.Task] = set()


@dataclass
class _Drain:
    """One provider stream being written to the cache, with its budgets."""

    writer: CacheWriter
    deadline: float
    size_cap: int
    total: int = field(default=0)

    def accept(self, chunk: bytes) -> bool:
        """Write ``chunk``, or return False when a budget says to stop."""
        if time.monotonic() > self.deadline:
            logger.warning("Narration audio stream exceeded its time budget")
            return False
        if self.total + len(chunk) > self.size_cap:
            logger.warning("Narration audio stream exceeded its size budget")
            return False
        self.total += len(chunk)
        self.writer.write(chunk)
        return True


def _start_download(stream, content_id: str, text: str) -> asyncio.Queue:
    """Begin draining the provider into the cache, and return the listener's queue.

    The download deliberately does not belong to the request task. A listener who
    stops playback cancels only `_relay`; cancelling that mid-read would otherwise
    tear down the provider read itself and throw away audio already paid for, so
    replaying the same narration would buy it a second time.
    """
    drain = _Drain(
        writer=open_writer(content_id, text),
        deadline=time.monotonic() + stream_timeout_seconds(),
        size_cap=max_stream_bytes(),
    )
    queue: asyncio.Queue = asyncio.Queue()
    _reap_finished_downloads()
    _downloads.add(asyncio.create_task(_download_to_cache(stream, drain, queue)))
    return queue


def _reap_finished_downloads() -> None:
    """Drop settled downloads, keeping the live set from growing without bound."""
    for task in [task for task in _downloads if task.done()]:
        _downloads.discard(task)


async def _download_to_cache(stream, drain: _Drain, queue: asyncio.Queue) -> None:
    """Read the provider to completion, publish it, then release the listener.

    A truncated download is never published: failure, timeout, and oversize all
    abandon the temp file. Publishing happens *before* the queue is closed so that a
    listener who reads to the end can rely on the cache entry already being there.
    """
    completed = False
    failure: BaseException | None = None

    try:
        async for chunk in stream.iter_bytes():
            if not drain.accept(chunk):
                break
            # Unbounded on purpose: a listener who hung up must never stall the
            # download. The size budget already caps how much can pile up here.
            queue.put_nowait(chunk)
        else:
            completed = True
    except Exception as exc:
        failure = exc
        logger.warning(f"Narration audio download failed: {type(exc).__name__}")

    if completed:
        await _publish(stream, drain)
    else:
        drain.writer.abandon()
        await stream.aclose()

    queue.put_nowait(failure if failure is not None else _END)


async def _publish(stream, drain: _Drain) -> None:
    """Commit a fully received download and release the provider handle."""
    published = None
    try:
        published = drain.writer.commit()
    finally:
        if published is None:
            # Either the output was implausibly short — commit already dropped the
            # temp file — or commit raised and left one behind. Both end here.
            drain.writer.abandon()
        await stream.aclose()

    if published is not None:
        cleanup_quietly()


async def _relay(queue: asyncio.Queue) -> AsyncIterator[bytes]:
    """Mirror a download to one listener. Cancelling this cannot stop the download."""
    while True:
        item = await queue.get()
        if item is _END:
            return
        if isinstance(item, BaseException):
            raise item
        yield item


async def wait_for_background_downloads() -> None:
    """Let in-flight downloads settle. For tests and orderly shutdown."""
    while True:
        _reap_finished_downloads()
        pending = tuple(_downloads)
        if not pending:
            return
        await asyncio.gather(*pending, return_exceptions=True)
