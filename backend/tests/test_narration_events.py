"""U3: narration deltas on the wire, and the settle/discard that resolves them.

Two seams are covered here:
  - the run-event handler turning narrate() argument fragments into narration_delta events
    (and ignoring every other tool), driven by synthetic event sequences;
  - narrate() itself emitting the settle or discard, since all three outcomes — accepted,
    omitted, vetoed — are decided inside the tool body (KTD3).
"""

import asyncio
import json
from types import SimpleNamespace

import pytest
from pydantic_ai import ModelRetry

from agent import runner
from agent.runner import AgentEventStream
from agent.tools import narrate
from api import turn_engine
from game.models import GameState
from game.session import PendingDeferred, Session

NARRATION = "The iron box is cold. Something inside it shifts."


# --------------------------------------------------------------------------- #
# Helpers
# --------------------------------------------------------------------------- #
async def feed(handler: AgentEventStream, events) -> None:
    async def stream():
        for event in events:
            yield event

    await handler.handle(stream())


def drive(handler: AgentEventStream, events) -> None:
    asyncio.run(feed(handler, events))


def recorder():
    got: list[tuple[str, dict]] = []
    return got, lambda event_type, payload: got.append((event_type, payload))


def tool_call_events(index: int, tool_name: str, call_id: str, text: str, size: int = 8):
    """A realistic start/delta.../end sequence for one streamed tool call."""
    from pydantic_ai.messages import (
        PartDeltaEvent,
        PartEndEvent,
        PartStartEvent,
        ToolCallPart,
        ToolCallPartDelta,
    )

    blob = json.dumps({"text": text})
    events = [
        PartStartEvent(
            index=index,
            part=ToolCallPart(tool_name=tool_name, args="", tool_call_id=call_id),
        )
    ]
    for i in range(0, len(blob), size):
        events.append(
            PartDeltaEvent(
                index=index,
                delta=ToolCallPartDelta(args_delta=blob[i : i + size], tool_call_id=call_id),
            )
        )
    events.append(
        PartEndEvent(
            index=index,
            part=ToolCallPart(tool_name=tool_name, args=blob, tool_call_id=call_id),
        )
    )
    return events


def deltas(got):
    return [p for t, p in got if t == "narration_delta"]


def queued_state(**kwargs) -> tuple[GameState, asyncio.Queue]:
    """A GameState with an active SSE queue, as a streamed turn would have."""
    gs = GameState(**kwargs)
    queue: asyncio.Queue = asyncio.Queue()
    gs._event_queue = queue
    return gs, queue


def drain(queue: asyncio.Queue) -> list[tuple[str, dict]]:
    out = []
    while not queue.empty():
        out.append(queue.get_nowait())
    return out


def ctx_for(gs: GameState, tool_call_id: str = "call-1"):
    return SimpleNamespace(deps=gs, tool_call_id=tool_call_id)


# --------------------------------------------------------------------------- #
# Handler: which tools stream (R1, R2, R4)
# --------------------------------------------------------------------------- #
def test_narrate_deltas_produce_ordered_cumulative_reveals():
    """Covers AE1 (streaming half)."""
    got, on_event = recorder()
    drive(AgentEventStream(on_event), tool_call_events(0, "narrate", "call-1", NARRATION))

    payloads = deltas(got)
    assert len(payloads) > 1, "expected progressive reveals"
    assert all(p["tool_call_id"] == "call-1" for p in payloads)
    texts = [p["text"] for p in payloads]
    assert texts[-1] == NARRATION
    for earlier, later in zip(texts, texts[1:]):
        assert later.startswith(earlier) and len(later) > len(earlier)


@pytest.mark.parametrize("tool_name", ["set_scene", "ask_player_roll", "apply_damage"])
def test_other_tools_produce_no_narration_deltas(tool_name):
    """Covers R2 — only narrate() is read for display."""
    got, on_event = recorder()
    drive(AgentEventStream(on_event), tool_call_events(0, tool_name, "call-1", NARRATION))

    assert deltas(got) == []


def test_two_narrate_calls_stream_independently():
    """Covers R4."""
    got, on_event = recorder()
    handler = AgentEventStream(on_event)
    drive(handler, tool_call_events(0, "narrate", "call-a", "Alpha narration here."))
    drive(handler, tool_call_events(1, "narrate", "call-b", "Beta narration here."))

    by_id: dict[str, list[str]] = {}
    for p in deltas(got):
        by_id.setdefault(p["tool_call_id"], []).append(p["text"])

    assert set(by_id) == {"call-a", "call-b"}
    assert by_id["call-a"][-1] == "Alpha narration here."
    assert by_id["call-b"][-1] == "Beta narration here."


def test_args_present_on_part_start_are_not_lost():
    """A provider that ships the opening fragment on the start event must still stream."""
    from pydantic_ai.messages import PartStartEvent, ToolCallPart

    got, on_event = recorder()
    drive(
        AgentEventStream(on_event),
        [
            PartStartEvent(
                index=0,
                part=ToolCallPart(
                    tool_name="narrate",
                    args=json.dumps({"text": NARRATION}),
                    tool_call_id="call-1",
                ),
            )
        ],
    )

    assert deltas(got) == [{"tool_call_id": "call-1", "text": NARRATION}]


def test_atomic_provider_produces_exactly_one_reveal():
    """Covers AE5 — one blob, one reveal, no error."""
    got, on_event = recorder()
    drive(
        AgentEventStream(on_event),
        tool_call_events(0, "narrate", "call-1", NARRATION, size=10_000),
    )

    assert len(deltas(got)) == 1


def test_leaked_markup_never_reaches_a_delta():
    """Covers AE2 on the wire."""
    leaky = "The wind dies.<tool_call>ask_player_roll<arg_key>dice_type</arg_key><arg_value>d20"
    got, on_event = recorder()
    drive(AgentEventStream(on_event), tool_call_events(0, "narrate", "call-1", leaky, size=4))

    for payload in deltas(got):
        assert "<tool_call" not in payload["text"]
        assert "ask_player_roll" not in payload["text"]


def test_reused_part_index_does_not_leak_the_previous_call():
    """A PartStartEvent replaces whatever was at that index."""
    got, on_event = recorder()
    handler = AgentEventStream(on_event)
    drive(handler, tool_call_events(0, "narrate", "call-a", "Alpha."))
    drive(handler, tool_call_events(0, "set_scene", "call-b", "Tavern"))

    assert {p["tool_call_id"] for p in deltas(got)} == {"call-a"}


# --------------------------------------------------------------------------- #
# Retry discard (R7)
# --------------------------------------------------------------------------- #
def test_whole_run_retry_discards_the_open_tool_call_id():
    got, on_event = recorder()
    handler = AgentEventStream(on_event)
    drive(handler, tool_call_events(0, "narrate", "call-1", NARRATION)[:-1])  # still open

    handler.discard_open_narrations()

    assert ("narration_discard", {"tool_call_id": "call-1"}) in got


def test_discard_is_idempotent_and_empty_when_nothing_is_open():
    got, on_event = recorder()
    handler = AgentEventStream(on_event)
    handler.discard_open_narrations()
    handler.discard_open_narrations()

    assert got == []


def test_run_retry_emits_discard_before_the_next_attempt(monkeypatch):
    """The failed attempt's half-written text must not survive into the retry."""
    got, on_event = recorder()
    calls = {"n": 0}

    class _FlakyAgent:
        async def run(self, *, event_stream_handler=None, **kwargs):
            calls["n"] += 1
            await feed(
                event_stream_handler,
                tool_call_events(0, "narrate", f"call-{calls['n']}", NARRATION)[:-1],
            )
            if calls["n"] == 1:
                raise Exception("Server Error: upstream hiccup")
            return "result"

    monkeypatch.setattr(runner, "gm_agent", _FlakyAgent())
    monkeypatch.setattr(runner.agent_mod, "RETRY_BASE_DELAY", 0)

    asyncio.run(
        runner.run_agent_iter(deps=None, message_history=[], user_prompt="hi", on_event=on_event)
    )

    assert ("narration_discard", {"tool_call_id": "call-1"}) in got
    discard_at = got.index(("narration_discard", {"tool_call_id": "call-1"}))
    second_attempt_at = next(
        i for i, (t, p) in enumerate(got)
        if t == "narration_delta" and p["tool_call_id"] == "call-2"
    )
    assert discard_at < second_attempt_at


# --------------------------------------------------------------------------- #
# narrate(): settle and discard (R6, R7)
# --------------------------------------------------------------------------- #
def test_narrate_settles_with_its_tool_call_id():
    """Covers AE1 (settle half) and R6."""
    gs, queue = queued_state()

    narrate(ctx_for(gs, "call-1"), NARRATION)

    assert drain(queue) == [("narration", {"text": NARRATION, "tool_call_id": "call-1"})]


def test_narrate_discards_when_narration_sanitizes_to_empty():
    """Covers AE4 — a roll-prompt-only narration leaves no empty bubble."""
    gs, queue = queued_state()

    result = narrate(
        ctx_for(gs, "call-1"),
        "<tool_call>ask_player_roll<arg_key>dice_type</arg_key><arg_value>d20",
    )

    assert result.startswith("Narration omitted")
    assert drain(queue) == [("narration_discard", {"tool_call_id": "call-1"})]
    assert gs._leaked_roll_args is not None, "leaked-roll recovery must still fire"


def test_narrate_discards_before_vetoing_a_premature_damage_narration():
    """Covers AE3 — the vetoed bubble is removed, then the retry streams into a new one."""
    gs, queue = queued_state()
    gs.awaiting_damage_roll = True

    with pytest.raises(ModelRetry, match="damage"):
        narrate(ctx_for(gs, "call-1"), "The goblin crumples and dies.")

    assert drain(queue) == [("narration_discard", {"tool_call_id": "call-1"})]
    assert gs.narrations == [], "vetoed text must not be recorded"


def test_narrate_is_silent_and_safe_without_an_event_queue():
    """The in-process CLI has no queue; nothing should be pushed and nothing should raise."""
    gs = GameState()
    assert gs._event_queue is None

    assert narrate(ctx_for(gs), NARRATION).startswith("Narration was shown")
    assert narrate(ctx_for(gs), "<tool_call>ask_player_roll").startswith("Narration omitted")

    gs.awaiting_damage_roll = True
    with pytest.raises(ModelRetry):
        narrate(ctx_for(gs), "It dies.")


# --------------------------------------------------------------------------- #
# Wiring through both turn paths (R3)
# --------------------------------------------------------------------------- #
def _stub_run_agent_iter(events):
    """Replay `events` through the caller's on_event, then finish the turn cleanly."""

    async def fake(deps, message_history, user_prompt=None, deferred_tool_results=None, on_event=None):
        if on_event is not None:
            for event_type, payload in events:
                on_event(event_type, payload)
        return SimpleNamespace(all_messages=lambda: [], output="notes")

    return fake


STREAMED = [
    ("narration_delta", {"tool_call_id": "call-1", "text": "The iron"}),
    ("narration_delta", {"tool_call_id": "call-1", "text": NARRATION}),
    ("narration", {"tool_call_id": "call-1", "text": NARRATION}),
]


async def _drain_stream(agen):
    return [ev async for ev in agen]


def test_fresh_turn_streams_narration_deltas(monkeypatch):
    monkeypatch.setattr(turn_engine, "run_agent_iter", _stub_run_agent_iter(STREAMED))
    session = Session(id="s1", game_state=GameState())

    events = asyncio.run(_drain_stream(turn_engine.stream_turn(session, "I look around")))
    types = [t for t, _ in events]

    assert types[: len(STREAMED)] == ["narration_delta", "narration_delta", "narration"]
    assert types[-1] == "complete"


def test_resume_after_dice_roll_streams_narration_deltas(monkeypatch):
    """Covers R3 — stream_deferred_response is wired to the same handler."""
    monkeypatch.setattr(turn_engine, "run_agent_iter", _stub_run_agent_iter(STREAMED))
    session = Session(id="s2", game_state=GameState())
    session.pending_deferred = PendingDeferred(
        messages_snapshot=[],
        deferred_calls=[{"tool_call_id": "roll-1", "tool_name": "ask_player_roll", "args": {}}],
    )

    events = asyncio.run(
        _drain_stream(turn_engine.stream_deferred_response(session, "🎲 [1d20] → 17"))
    )
    types = [t for t, _ in events]

    assert types[: len(STREAMED)] == ["narration_delta", "narration_delta", "narration"]
    assert types[-1] == "complete"


def test_replayed_first_tool_call_batch_does_not_re_emit_narration():
    """Covers R3's second half.

    On a deferred resume the first call-tools node replays the previous response's tool
    calls. Its stream carries only HandleResponseEvents, so no narration from the prior
    response can be re-emitted.
    """
    from pydantic_ai.messages import (
        FunctionToolCallEvent,
        FunctionToolResultEvent,
        ToolCallPart,
        ToolReturnPart,
    )

    got, on_event = recorder()
    call = ToolCallPart(tool_name="narrate", args=json.dumps({"text": NARRATION}), tool_call_id="old")
    drive(
        AgentEventStream(on_event),
        [
            FunctionToolCallEvent(call),
            FunctionToolResultEvent(
                ToolReturnPart(tool_name="narrate", content="shown", tool_call_id="old")
            ),
        ],
    )

    assert got == []
