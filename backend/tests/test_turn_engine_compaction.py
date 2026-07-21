"""Integration: compaction wired into the streamed turn path under the session lock.

Covers the seam the unit tests can't: that stream_turn actually invokes
maybe_compact after _handle_result sets message_history, and that a summarizer
failure during post-response compaction never surfaces as a turn error.
"""

import asyncio
from types import SimpleNamespace

from pydantic_ai.messages import (
    ModelRequest,
    ModelResponse,
    RequestUsage,
    TextPart,
    UserPromptPart,
)

from api import turn_engine
from game.models import GameState
from game.session import Session


def _resp(input_tokens):
    return ModelResponse(
        parts=[TextPart(content="narration")],
        usage=RequestUsage(input_tokens=input_tokens),
    )


def _turn_req(text):
    return ModelRequest(parts=[UserPromptPart(content=text)])


def _big_history(last_tokens):
    msgs = []
    for i in range(6):
        msgs.append(_turn_req("z" * 80_000 + f" turn {i}"))
        msgs.append(_resp(1000))
    msgs[-1] = _resp(last_tokens)
    return msgs


def _fake_result(msgs, output="notes"):
    return SimpleNamespace(all_messages=lambda: msgs, output=output)


async def _drain(agen):
    return [ev async for ev in agen]


def _stub_run_agent_iter(msgs):
    async def fake(deps, message_history, user_prompt=None, deferred_tool_results=None, on_thinking=None):
        return _fake_result(msgs)

    return fake


def test_stream_turn_compacts_over_threshold(monkeypatch):
    msgs = _big_history(305_000)

    async def fake_summarize(prior, prefix):
        return "RECAP"

    monkeypatch.setattr(turn_engine, "run_agent_iter", _stub_run_agent_iter(msgs))
    monkeypatch.setattr("agent.summarizer.summarize", fake_summarize)

    session = Session(id="t1", game_state=GameState())
    events = asyncio.run(_drain(turn_engine.stream_turn(session, "I look around")))
    types = [e[0] for e in events]

    assert "complete" in types
    assert "error" not in types
    # maybe_compact ran on the post-turn history (set by _handle_result) under the lock.
    assert session.game_state.story_summary == "RECAP"
    assert len(session.message_history) < len(msgs)


def test_stream_turn_summarizer_failure_emits_no_error(monkeypatch):
    msgs = _big_history(305_000)

    async def boom(prior, prefix):
        raise RuntimeError("summarizer down")

    monkeypatch.setattr(turn_engine, "run_agent_iter", _stub_run_agent_iter(msgs))
    monkeypatch.setattr("agent.summarizer.summarize", boom)

    session = Session(id="t2", game_state=GameState())
    events = asyncio.run(_drain(turn_engine.stream_turn(session, "I look around")))
    types = [e[0] for e in events]

    assert "complete" in types
    assert "error" not in types  # post-response compaction failure is swallowed
    assert session.message_history == msgs  # untrimmed; carries forward
    assert session.game_state.story_summary is None
