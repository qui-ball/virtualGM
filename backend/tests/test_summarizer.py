"""U4: summarizer model resolution, transcript render, recursive summarize."""

import asyncio
from types import SimpleNamespace

from pydantic_ai.messages import (
    ModelRequest,
    ModelResponse,
    ToolCallPart,
    ToolReturnPart,
    UserPromptPart,
)

from agent import summarizer


# --- model resolution (R7 + preset fallback) --------------------------------


def test_resolve_known_preset_is_used():
    assert summarizer.resolve_summary_preset("gemini-flash") == "gemini-flash"


def test_resolve_unknown_preset_falls_back():
    assert summarizer.resolve_summary_preset("bogus-model") == summarizer.SUMMARY_DEFAULT


def test_resolve_none_uses_default():
    assert summarizer.resolve_summary_preset(None) == summarizer.SUMMARY_DEFAULT


# --- render_transcript (R4, R6) ---------------------------------------------


def _sample_messages():
    return [
        ModelRequest(parts=[UserPromptPart(content="I enter the cave")]),
        ModelResponse(
            parts=[
                ToolCallPart(
                    tool_name="narrate",
                    args={"text": "The cave mouth yawns in the cliff face."},
                    tool_call_id="c1",
                )
            ]
        ),
        ModelRequest(
            parts=[
                ToolReturnPart(
                    tool_name="narrate", content="Narration shown", tool_call_id="c1"
                )
            ]
        ),
        ModelResponse(
            parts=[
                ToolCallPart(
                    tool_name="apply_damage",
                    args={"target": "pc", "amount": 3},
                    tool_call_id="c2",
                )
            ]
        ),
        ModelRequest(
            parts=[
                ToolReturnPart(
                    tool_name="apply_damage",
                    content="pc HP now 9",
                    tool_call_id="c2",
                )
            ]
        ),
        ModelResponse(
            parts=[
                ToolCallPart(
                    tool_name="roll_dice",
                    args={"dice_count": 1, "dice_type": "d20"},
                    tool_call_id="c3",
                )
            ]
        ),
        ModelRequest(
            parts=[
                ToolReturnPart(
                    tool_name="roll_dice",
                    content="\U0001f3b2 [1d20] → 14",
                    tool_call_id="c3",
                )
            ]
        ),
    ]


def test_render_transcript_keeps_narrative_drops_plumbing():
    out = summarizer.render_transcript(_sample_messages())
    assert "Player: I enter the cave" in out
    assert "GM: The cave mouth yawns in the cliff face." in out
    assert "[1d20] → 14" in out
    # Mechanical state traffic is excluded — GameState carries it.
    assert "apply_damage" not in out
    assert "pc HP now 9" not in out


# --- summarize is recursive (R5) --------------------------------------------


def test_summarize_folds_prior_and_transcript(monkeypatch):
    captured = {}

    async def fake_run(prompt, **kwargs):
        captured["prompt"] = prompt
        return SimpleNamespace(output="One updated recap.")

    monkeypatch.setattr(summarizer.summarizer_agent, "run", fake_run)

    msgs = [ModelRequest(parts=[UserPromptPart(content="I open the iron door")])]
    out = asyncio.run(summarizer.summarize("PRIOR RECAP", msgs))

    assert out == "One updated recap."
    # The prior summary and the new transcript both feed a single request.
    assert "PRIOR RECAP" in captured["prompt"]
    assert "I open the iron door" in captured["prompt"]
