"""U5: maybe_compact orchestration — thresholds, recursion, and R3 guard."""

import asyncio
from types import SimpleNamespace

from pydantic_ai import DeferredToolRequests
from pydantic_ai.messages import (
    ModelRequest,
    ModelResponse,
    RequestUsage,
    TextPart,
    UserPromptPart,
)

from agent import compaction
from game.models import GameState


def _resp(input_tokens, text="narration"):
    return ModelResponse(
        parts=[TextPart(content=text)], usage=RequestUsage(input_tokens=input_tokens)
    )


def _turn_req(text):
    return ModelRequest(parts=[UserPromptPart(content=text)])


def _big_history(last_tokens):
    """Six large turns; the final response reports `last_tokens` context size."""
    msgs = []
    for i in range(6):
        msgs.append(_turn_req("z" * 80_000 + f" turn {i}"))
        msgs.append(_resp(1000))
    msgs[-1] = _resp(last_tokens)
    return msgs


def _session(msgs, summary=None):
    gs = GameState()
    gs.story_summary = summary
    return SimpleNamespace(game_state=gs, message_history=msgs)


def _result(msgs, output="notes"):
    return SimpleNamespace(all_messages=lambda: msgs, output=output)


def _patch_summarize(monkeypatch, captured):
    async def fake_summarize(prior, prefix):
        captured["prior"] = prior
        captured["prefix_len"] = len(prefix)
        captured["called"] = True
        return "RECAP v2"

    captured["called"] = False
    monkeypatch.setattr("agent.summarizer.summarize", fake_summarize)


def test_below_threshold_is_noop(monkeypatch):
    captured = {}
    _patch_summarize(monkeypatch, captured)
    msgs = _big_history(120_000)  # below 300k
    session = _session(list(msgs))

    did = asyncio.run(compaction.maybe_compact(session, _result(msgs)))

    assert did is False
    assert captured["called"] is False
    assert session.message_history == msgs
    assert session.game_state.story_summary is None


def test_compacts_above_threshold(monkeypatch):
    # R8/R9: trims history to the recent window and sets the summary.
    captured = {}
    _patch_summarize(monkeypatch, captured)
    msgs = _big_history(305_000)
    session = _session(list(msgs))

    did = asyncio.run(compaction.maybe_compact(session, _result(msgs)))

    assert did is True
    assert session.game_state.story_summary == "RECAP v2"
    assert len(session.message_history) < len(msgs)
    assert isinstance(session.message_history[0], ModelRequest)
    assert any(isinstance(p, UserPromptPart) for p in session.message_history[0].parts)
    assert captured["prefix_len"] > 0


def test_recursive_passes_prior_summary(monkeypatch):
    # R5/AE3: the existing summary is folded in, not appended alongside.
    captured = {}
    _patch_summarize(monkeypatch, captured)
    msgs = _big_history(305_000)
    session = _session(list(msgs), summary="OLD RECAP")

    asyncio.run(compaction.maybe_compact(session, _result(msgs)))

    assert captured["prior"] == "OLD RECAP"
    assert session.game_state.story_summary == "RECAP v2"


def test_deferred_roll_is_never_compacted(monkeypatch):
    # R3/AE2: a turn paused awaiting a player roll is not settled — no compaction,
    # even above threshold.
    captured = {}
    _patch_summarize(monkeypatch, captured)
    msgs = _big_history(305_000)
    session = _session(list(msgs))
    result = _result(msgs, output=DeferredToolRequests())

    did = asyncio.run(compaction.maybe_compact(session, result))

    assert did is False
    assert captured["called"] is False
    assert session.message_history == msgs
    assert session.game_state.story_summary is None
