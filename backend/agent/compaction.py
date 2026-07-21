"""Rolling transcript compaction: measure context, slice history, summarize.

When a completed turn's context crosses COMPACT_THRESHOLD, the oldest turns are
folded into a running "story so far" summary (kept on GameState) and dropped from
the raw transcript, leaving only the summary plus a recent raw window.
"""

import os

from pydantic_ai.messages import ModelRequest, ModelResponse, UserPromptPart

# Compaction fires when the last turn's context reaches this many input tokens.
# 400k is the documented model-window assumption; overshoot past 300k is absorbed
# by that headroom, so there is no separate enforced ceiling.
COMPACT_THRESHOLD = int(os.getenv("COMPACT_THRESHOLD", "300000"))

# Tokens of most-recent transcript kept raw after a compaction.
RECENT_WINDOW_TOKENS = int(os.getenv("RECENT_WINDOW_TOKENS", "100000"))


def context_input_tokens(result) -> int | None:
    """Input-token count of the last request in a completed run — the true context size.

    Uses the final ModelResponse's usage rather than ``result.usage()``, which sums
    input tokens across every request in the turn (tool-call round-trips re-send the
    whole context) and so over-counts. Scans from the end for the most recent response
    carrying a positive count; returns None when none does (missing usage, or a stray
    zero from the provider) so compaction treats it as a safe no-op.
    """
    for msg in reversed(result.all_messages()):
        if isinstance(msg, ModelResponse):
            usage = getattr(msg, "usage", None)
            tokens = getattr(usage, "input_tokens", None)
            if tokens:  # positive and non-None
                return tokens
    return None


def should_compact(token_count: int | None) -> bool:
    """True when a completed turn's context has reached the compaction threshold."""
    return token_count is not None and token_count >= COMPACT_THRESHOLD


def _part_text(part) -> str:
    """Best-effort text of a message part, for rough token estimation."""
    for attr in ("content", "args"):
        val = getattr(part, attr, None)
        if val is not None:
            return val if isinstance(val, str) else str(val)
    return ""


def _estimate_tokens(msg) -> int:
    """Rough per-message token estimate (serialized length / 4).

    pydantic-ai reports usage per request, not per stored message, so exact
    per-message counts are unavailable; this estimate only sizes the recent
    window and precision is unnecessary given the trigger headroom.
    """
    return sum(len(_part_text(p)) for p in msg.parts) // 4


def _is_turn_boundary(msg) -> bool:
    """A ModelRequest carrying a player prompt — the clean start of a turn."""
    return isinstance(msg, ModelRequest) and any(
        isinstance(p, UserPromptPart) for p in msg.parts
    )


def split_history(messages, recent_window_tokens: int = RECENT_WINDOW_TOKENS):
    """Partition transcript into (prefix_to_summarize, recent_suffix_to_keep).

    Keeps the most recent whole turns that fit within ``recent_window_tokens`` and
    cuts only at a player-turn boundary, so the suffix never orphans a tool call
    from its return. Returns ``([], messages)`` (no-op) when the whole transcript
    fits the window, or when a single turn already exceeds it (can't cut below one
    turn). Satisfies R8.
    """
    messages = list(messages)
    if sum(_estimate_tokens(m) for m in messages) <= recent_window_tokens:
        return [], messages

    # Boundaries after index 0 — cutting there leaves a non-empty prefix.
    boundaries = [i for i, m in enumerate(messages) if i > 0 and _is_turn_boundary(m)]
    if not boundaries:
        return [], messages  # only one turn present; nothing to age out

    # Suffix grows as the cut moves earlier. Walk from the latest boundary back,
    # keeping the earliest cut whose retained suffix still fits the window.
    chosen = boundaries[-1]  # fallback: keep just the last turn
    for b in reversed(boundaries):
        if sum(_estimate_tokens(m) for m in messages[b:]) <= recent_window_tokens:
            chosen = b
        else:
            break
    return messages[:chosen], messages[chosen:]
