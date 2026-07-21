"""Separate, cheaper summarizer that folds aged-out turns into a running summary.

Used by compaction: given the current "story so far" plus the transcript turns
aging out of context, produce one replacement summary (recursive, single block).
Runs on an independently configurable model (SUMMARY_MODEL_PRESET) so cost is
controlled and the GM model is not spent on narrative compression.
"""

import os

from loguru import logger
from pydantic_ai import Agent
from pydantic_ai.messages import ToolCallPart, ToolReturnPart, UserPromptPart

from agent.definition import MODEL_PRESETS, build_model_settings

# Cheap, large-context default — must hold the aged-out turns in one pass.
SUMMARY_DEFAULT = "gemini-flash-lite"

# Tool returns worth keeping in the narrative transcript (roll outcomes). Other
# tool traffic is mechanical state, already tracked in GameState — dropped.
_NARRATIVE_ROLL_TOOLS = {"roll_dice", "ask_player_roll"}


def resolve_summary_preset(name: str | None) -> str:
    """Resolve SUMMARY_MODEL_PRESET, warning and falling back on an unknown value.

    Mirrors the main-model resolution in definition.py so a typo'd env var degrades
    to a working cheap model instead of raising KeyError mid-compaction.
    """
    name = name or SUMMARY_DEFAULT
    if name not in MODEL_PRESETS:
        logger.warning(
            f"Unknown SUMMARY_MODEL_PRESET '{name}', falling back to '{SUMMARY_DEFAULT}'"
        )
        return SUMMARY_DEFAULT
    return name


_SUMMARY_PRESET = resolve_summary_preset(os.getenv("SUMMARY_MODEL_PRESET"))
_SUMMARY_MODEL_NAME, _SUMMARY_PROVIDER = MODEL_PRESETS[_SUMMARY_PRESET]
# Mirror the GM agent: apply OpenRouter provider routing for the chosen preset.
_summary_model_settings = build_model_settings(_SUMMARY_PROVIDER)

summarizer_agent = Agent(
    f"openrouter:{_SUMMARY_MODEL_NAME}",
    output_type=str,
    instructions="""You maintain the running "story so far" for a solo tabletop RPG session.

You are given the current summary and a batch of older transcript turns that are aging out of the game master's context. Fold them together into ONE updated summary that preserves narrative continuity.

Capture: what happened, choices the player made, NPCs met and their dispositions toward the party, places visited, promises and threats, and unresolved threads or open goals.

Do NOT record mechanical state — hit points, inventory, gold, conditions, exact dice results. That is tracked separately and re-injected each turn; repeating it wastes space and goes stale.

Write tight past-tense prose. Merge the new events into the existing summary rather than appending a separate section — the result must read as a single continuous recap, not a changelog. Return only the updated summary text.""",
)


def render_transcript(messages) -> str:
    """Extract a readable narrative transcript from aged-out messages.

    Keeps player prompts, GM narration (narrate() calls), and roll outcomes; drops
    raw tool-call plumbing and mechanical state-change traffic.
    """
    lines: list[str] = []
    for msg in messages:
        for part in msg.parts:
            if isinstance(part, UserPromptPart):
                content = part.content
                if isinstance(content, str) and content.strip():
                    lines.append(f"Player: {content.strip()}")
            elif isinstance(part, ToolCallPart) and part.tool_name == "narrate":
                try:
                    args = part.args_as_dict()
                except Exception:
                    args = {}
                text = args.get("text") if isinstance(args, dict) else None
                if isinstance(text, str) and text.strip():
                    lines.append(f"GM: {text.strip()}")
            elif isinstance(part, ToolReturnPart) and part.tool_name in _NARRATIVE_ROLL_TOOLS:
                content = part.content
                if isinstance(content, str) and content.strip():
                    lines.append(f"Roll: {content.strip()}")
    return "\n".join(lines)


async def summarize(prior_summary: str | None, prefix_messages) -> str:
    """Fold the prior summary and the aged-out turns into one replacement summary."""
    transcript = render_transcript(prefix_messages)
    prompt = (
        "Current running summary:\n"
        f"{prior_summary or '(none yet — this is the first compaction)'}\n\n"
        "Older turns now aging out of context:\n"
        f"{transcript}\n\n"
        "Produce the single updated running summary."
    )
    result = await summarizer_agent.run(prompt, model_settings=_summary_model_settings)
    return result.output
