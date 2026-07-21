"""U2/U3: context-size measurement, thresholds, and transcript slicing."""

from types import SimpleNamespace

from pydantic_ai.messages import (
    ModelRequest,
    ModelResponse,
    RequestUsage,
    TextPart,
    ToolCallPart,
    ToolReturnPart,
    UserPromptPart,
)

from agent import compaction


def _result(messages):
    return SimpleNamespace(all_messages=lambda: messages)


def _resp(input_tokens, text="narration"):
    return ModelResponse(
        parts=[TextPart(content=text)],
        usage=RequestUsage(input_tokens=input_tokens),
    )


def _turn_req(text="I search the room"):
    """A ModelRequest that starts a turn (carries a player UserPromptPart)."""
    return ModelRequest(parts=[UserPromptPart(content=text)])


def _tool_return_req(name="roll_dice"):
    """A ModelRequest carrying only a tool return — NOT a turn boundary."""
    return ModelRequest(
        parts=[ToolReturnPart(tool_name=name, content="🎲 → 14", tool_call_id="c1")]
    )


def _tool_call_resp(name="roll_dice", input_tokens=1000):
    return ModelResponse(
        parts=[ToolCallPart(tool_name=name, args={}, tool_call_id="c1")],
        usage=RequestUsage(input_tokens=input_tokens),
    )


# --- U2: measurement + thresholds -------------------------------------------


def test_context_input_tokens_reads_last_response():
    # R1: context size is the final request's input-token count.
    msgs = [_turn_req(), _resp(120000), _turn_req(), _resp(305000)]
    assert compaction.context_input_tokens(_result(msgs)) == 305000


def test_should_compact_at_threshold():
    # R2: 300k default threshold.
    assert compaction.should_compact(305000) is True
    assert compaction.should_compact(250000) is False


def test_context_input_tokens_none_without_usage():
    # No usage-bearing response -> None -> safe no-op.
    msgs = [_turn_req()]
    assert compaction.context_input_tokens(_result(msgs)) is None
    assert compaction.should_compact(None) is False


def test_zero_input_tokens_treated_as_unknown():
    # A stray provider 0 must not read as "below threshold" and must no-op.
    msgs = [_turn_req(), _resp(0)]
    assert compaction.context_input_tokens(_result(msgs)) is None


# --- U3: slicing at turn boundaries -----------------------------------------


def test_split_history_cuts_at_user_prompt_boundary():
    # R8: many turns above the window -> non-empty prefix, suffix starts at a turn.
    msgs = []
    for i in range(6):
        msgs.append(_turn_req("x" * 80_000 + f" turn {i}"))
        msgs.append(_resp(1000))
    prefix, suffix = compaction.split_history(msgs, recent_window_tokens=100_000)
    assert prefix, "expected an aged-out prefix to summarize"
    assert suffix, "expected a retained recent window"
    assert isinstance(suffix[0], ModelRequest)
    assert any(isinstance(p, UserPromptPart) for p in suffix[0].parts)
    assert prefix + suffix == msgs  # partition invariant, nothing lost


def test_split_history_noop_when_under_window():
    msgs = [_turn_req("small"), _resp(1000), _turn_req("small"), _resp(1000)]
    prefix, suffix = compaction.split_history(msgs, recent_window_tokens=100_000)
    assert prefix == []
    assert suffix == msgs


def test_split_history_noop_when_single_turn_exceeds_window():
    # Cannot cut below one turn -> no-op rather than an invalid slice.
    msgs = [_turn_req("y" * 500_000), _resp(1000)]
    prefix, suffix = compaction.split_history(msgs, recent_window_tokens=100_000)
    assert prefix == []
    assert suffix == msgs


def test_split_history_never_orphans_tool_return():
    # The cut must land on a player-turn boundary, never between a tool call and
    # its return (which would leave the suffix structurally invalid).
    msgs = [
        _turn_req("t0 " + "a" * 80_000),
        _tool_call_resp(),
        _tool_return_req(),
        _resp(1000),
        _turn_req("t1 " + "b" * 80_000),
        _tool_call_resp(),
        _tool_return_req(),
        _resp(1000),
    ]
    # Window forces a cut between the two turns (each ~20k, window 25k).
    prefix, suffix = compaction.split_history(msgs, recent_window_tokens=25_000)
    assert prefix + suffix == msgs
    assert prefix, "expected turn 0 (with its tool round-trip) to age out"
    # suffix must begin at a player-turn ModelRequest, not a tool-return request.
    assert isinstance(suffix[0], ModelRequest)
    assert any(isinstance(p, UserPromptPart) for p in suffix[0].parts)
