"""Turn narrate() argument fragments into player-safe, cumulative text reveals.

The GM's player-visible channel is the `text` argument of a narrate() tool call, not model
output text. Streaming it means reading `ToolCallPartDelta.args_delta` — incremental JSON
fragments — and partial-parsing `text` back out of them as they land.

This module is deliberately pure: no agent, no network, no queue. Everything else in the
streaming path needs a live model to exercise; the parsing and sanitizing logic is where the
real defects live, so it sits behind a plain function boundary and is unit-tested directly.
"""

from __future__ import annotations

import json
from dataclasses import dataclass
from typing import Any

from pydantic_core import from_json

from api.narration_sanitize import extract_leaked_ask_player_roll

# Longest prefix we might be holding back while waiting to see whether a trailing `<` is the
# start of leaked tool markup.
_OPEN_TAG = "<tool_call>"


def partial_narration_text(buf: str) -> str | None:
    """Pull `text` out of a possibly-incomplete JSON args blob.

    Returns None when the buffer does not (yet) parse, or carries no string `text` field.
    A fragment that lands mid-key produces no text — that is the expected quiet case, not
    an error.
    """
    if not buf:
        return None
    try:
        obj = from_json(buf, allow_partial="trailing-strings")
    except ValueError:
        return None
    if isinstance(obj, dict):
        value = obj.get("text")
        if isinstance(value, str):
            return value
    return None


def _trim_partial_open_tag(text: str) -> str:
    """Drop a trailing `<t…` that could still become leaked `<tool_call>` markup.

    Sanitizing only strips *complete* markup, so mid-stream a half-written tag would paint
    to the player for a frame or two. Holding the tail back costs nothing: the next fragment
    either completes the tag (and it is stripped) or proves it was ordinary prose (and it is
    revealed one reveal later).
    """
    start = text.rfind("<")
    if start == -1:
        return text
    tail = text[start:].lower()
    if len(tail) < len(_OPEN_TAG) and _OPEN_TAG.startswith(tail):
        return text[:start]
    return text


def sanitize_partial(text: str) -> str:
    """Player-safe view of an in-flight narration `text` value."""
    cleaned, _leaked = extract_leaked_ask_player_roll(text)
    return _trim_partial_open_tag(cleaned).rstrip()


@dataclass
class _CallState:
    """Accumulated streaming state for one narrate() tool call.

    A provider sends args either as JSON string fragments (appended) or as dicts (merged) —
    `ToolCallPartDelta` defines both. The two are tracked separately because they compose
    differently; concatenating serialized dicts would produce `{...}{...}`, which never parses.
    """

    buffer: str = ""
    dict_args: dict[str, Any] | None = None
    last_emitted: str | None = None


class NarrationStream:
    """Accumulate narrate() args fragments per tool call id and yield sanitized reveals.

    Each reveal is the *cumulative* player-safe text so far, not the fragment that produced
    it. Cumulative payloads are idempotent: a client that drops or reorders a frame still
    converges, and no client has to reimplement partial-JSON parsing or sanitization.
    """

    def __init__(self) -> None:
        self._calls: dict[str, _CallState] = {}

    def feed(
        self, tool_call_id: str, args_delta: str | dict[str, Any] | None
    ) -> str | None:
        """Add a fragment; return the new cumulative sanitized text, or None.

        None means "nothing new to paint" — the args do not parse yet, or the sanitized
        result is unchanged from the last reveal.

        String fragments append (they are pieces of one JSON blob); dict fragments merge, per
        `ToolCallPartDelta`. Serializing dicts into the string buffer instead would leave it
        permanently unparseable after the second one, silently ending the stream.
        """
        if not args_delta:
            return None

        state = self._calls.setdefault(tool_call_id, _CallState())
        if isinstance(args_delta, dict):
            state.dict_args = {**(state.dict_args or {}), **args_delta}
            value = state.dict_args.get("text")
            raw = value if isinstance(value, str) else None
        else:
            state.buffer += args_delta
            raw = partial_narration_text(state.buffer)

        if raw is None:
            return None

        text = sanitize_partial(raw)
        if text == state.last_emitted:
            return None
        if not text and state.last_emitted is None:
            # `{"text":"` parses long before any prose arrives, and a roll-prompt-only
            # narration sanitizes to empty for its whole life. Staying quiet until there is
            # something to show keeps clients from flashing an empty bubble open and shut.
            return None
        state.last_emitted = text
        return text

    def open_ids(self) -> list[str]:
        """Tool call ids with accumulated state that has not been settled or discarded."""
        return list(self._calls)

    def close(self, tool_call_id: str) -> None:
        """Forget a call's state. A no-op for an id that was never fed."""
        self._calls.pop(tool_call_id, None)

    def close_all(self) -> None:
        """Forget every call's state — used when a whole run is retried."""
        self._calls.clear()
