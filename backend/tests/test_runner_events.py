"""U2: the run-event handler that replaced the manual node walk.

Drives the handler with synthetic event sequences — no live model. The retry tests swap in a
fake agent so the retry contract can be exercised without a network call.
"""

import asyncio

import pytest
from pydantic_ai.messages import (
    FunctionToolCallEvent,
    FunctionToolResultEvent,
    PartDeltaEvent,
    PartEndEvent,
    PartStartEvent,
    TextPart,
    TextPartDelta,
    ThinkingPart,
    ThinkingPartDelta,
    ToolCallPart,
    ToolReturnPart,
)

from agent import runner
from agent.runner import AgentEventStream


def drive(handler: AgentEventStream, events) -> None:
    """Feed one node's worth of events through the handler."""

    async def stream():
        for event in events:
            yield event

    asyncio.run(handler.handle(stream()))


def recorder():
    """An (event_type, payload) callback plus the list it appends to."""
    got: list[tuple[str, dict]] = []
    return got, lambda event_type, payload: got.append((event_type, payload))


def thinking_block(index: int, chunks: list[str]) -> list:
    """A realistic start/delta.../end sequence for one thinking part."""
    events = [PartStartEvent(index=index, part=ThinkingPart(content=""))]
    for chunk in chunks:
        events.append(
            PartDeltaEvent(index=index, delta=ThinkingPartDelta(content_delta=chunk))
        )
    events.append(
        PartEndEvent(index=index, part=ThinkingPart(content="".join(chunks)))
    )
    return events


# --------------------------------------------------------------------------- #
# Thinking (R8)
# --------------------------------------------------------------------------- #
def test_deltas_on_one_index_produce_one_callback_at_part_end():
    got, on_event = recorder()
    drive(AgentEventStream(on_event), thinking_block(0, ["I should ", "check the ", "lock."]))

    assert got == [("thinking", {"text": "I should check the lock."})]


def test_no_callback_fires_before_part_end():
    got, on_event = recorder()
    handler = AgentEventStream(on_event)
    drive(handler, thinking_block(0, ["one", "two"])[:-1])  # everything but PartEndEvent

    assert got == []


def test_two_thinking_parts_produce_two_callbacks_with_their_own_content():
    got, on_event = recorder()
    handler = AgentEventStream(on_event)
    drive(handler, thinking_block(0, ["first block"]) + thinking_block(1, ["second block"]))

    assert got == [
        ("thinking", {"text": "first block"}),
        ("thinking", {"text": "second block"}),
    ]


def test_thinking_content_already_present_on_part_start_is_kept():
    """Some providers hand back a whole thinking block with no deltas at all."""
    got, on_event = recorder()
    drive(
        AgentEventStream(on_event),
        [
            PartStartEvent(index=0, part=ThinkingPart(content="whole block")),
            PartEndEvent(index=0, part=ThinkingPart(content="whole block")),
        ],
    )

    assert got == [("thinking", {"text": "whole block"})]


def test_empty_thinking_block_produces_no_callback():
    got, on_event = recorder()
    drive(
        AgentEventStream(on_event),
        [
            PartStartEvent(index=0, part=ThinkingPart(content="")),
            PartEndEvent(index=0, part=ThinkingPart(content="")),
        ],
    )

    assert got == []


def test_event_sequence_with_no_thinking_parts_produces_no_callbacks():
    got, on_event = recorder()
    drive(
        AgentEventStream(on_event),
        [
            PartStartEvent(index=0, part=TextPart(content="")),
            PartDeltaEvent(index=0, delta=TextPartDelta(content_delta="private notes")),
            PartEndEvent(index=0, part=TextPart(content="private notes")),
        ],
    )

    assert got == []


def test_replayed_call_tools_node_produces_no_thinking_callbacks():
    """Why is_first_call_tools_node could be deleted.

    On a deferred resume the first call-tools node replays the previous response. Its stream
    carries only HandleResponseEvents — never part events — so the duplicate thinking the old
    flag guarded against cannot recur.
    """
    got, on_event = recorder()
    call = ToolCallPart(tool_name="ask_player_roll", args='{"dice_count":1}', tool_call_id="c1")
    drive(
        AgentEventStream(on_event),
        [
            FunctionToolCallEvent(call),
            FunctionToolResultEvent(
                ToolReturnPart(tool_name="ask_player_roll", content="17", tool_call_id="c1")
            ),
        ],
    )

    assert got == []


def test_handler_without_a_callback_is_a_no_op():
    drive(AgentEventStream(None), thinking_block(0, ["thinking"]))  # must not raise


def test_handler_state_survives_across_node_calls():
    """pydantic-ai invokes the handler once per graph node; one instance spans the run."""
    got, on_event = recorder()
    handler = AgentEventStream(on_event)
    drive(handler, thinking_block(0, ["first node"]))
    drive(handler, thinking_block(0, ["second node"]))

    assert got == [
        ("thinking", {"text": "first node"}),
        ("thinking", {"text": "second node"}),
    ]


# --------------------------------------------------------------------------- #
# run_agent_iter retry contract
# --------------------------------------------------------------------------- #
TRANSIENT = "openrouter Server Error: upstream hiccup"
FATAL = "invalid api key"


class _FakeAgent:
    """Stands in for gm_agent: replays scripted outcomes and records the handler it got."""

    def __init__(self, outcomes):
        self._outcomes = list(outcomes)
        self.calls = 0
        self.handlers = []

    async def run(self, *, event_stream_handler=None, **kwargs):
        self.calls += 1
        self.handlers.append(event_stream_handler)
        outcome = self._outcomes.pop(0)
        if isinstance(outcome, Exception):
            raise outcome
        return outcome


@pytest.fixture
def no_backoff(monkeypatch):
    monkeypatch.setattr(runner.agent_mod, "RETRY_BASE_DELAY", 0)


def _run(deps=None, **kwargs):
    return asyncio.run(
        runner.run_agent_iter(deps=deps, message_history=[], **kwargs)
    )


def test_transient_error_retries_then_succeeds(monkeypatch, no_backoff):
    fake = _FakeAgent([Exception(TRANSIENT), Exception(TRANSIENT), "result"])
    monkeypatch.setattr(runner, "gm_agent", fake)

    assert _run(user_prompt="hi") == "result"
    assert fake.calls == 3


def test_transient_error_surfaces_the_original_exception_after_exhausting_attempts(
    monkeypatch, no_backoff
):
    original = Exception(TRANSIENT)
    fake = _FakeAgent([Exception(TRANSIENT), Exception(TRANSIENT), original])
    monkeypatch.setattr(runner, "gm_agent", fake)

    with pytest.raises(Exception) as excinfo:
        _run(user_prompt="hi")

    assert excinfo.value is original
    assert fake.calls == runner.agent_mod.MAX_RETRIES


def test_non_transient_error_is_not_retried(monkeypatch, no_backoff):
    fake = _FakeAgent([Exception(FATAL), "unreached"])
    monkeypatch.setattr(runner, "gm_agent", fake)

    with pytest.raises(Exception, match=FATAL):
        _run(user_prompt="hi")

    assert fake.calls == 1


def test_each_attempt_gets_an_event_stream_handler(monkeypatch, no_backoff):
    fake = _FakeAgent([Exception(TRANSIENT), "result"])
    monkeypatch.setattr(runner, "gm_agent", fake)

    _run(user_prompt="hi")

    assert len(fake.handlers) == 2
    assert all(isinstance(h, AgentEventStream) for h in fake.handlers)
    assert fake.handlers[0] is not fake.handlers[1], "a retry must not reuse stale state"


def test_optional_run_kwargs_are_only_passed_when_set(monkeypatch, no_backoff):
    seen = {}

    class _Capture(_FakeAgent):
        async def run(self, *, event_stream_handler=None, **kwargs):
            seen.update(kwargs)
            return "result"

    monkeypatch.setattr(runner, "gm_agent", _Capture(["result"]))
    _run(user_prompt="hi")

    assert seen["user_prompt"] == "hi"
    assert "deferred_tool_results" not in seen
