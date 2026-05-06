"""Pydantic-ai agent for the generalist GM harness.

The agent has EXACTLY 4 tools registered (read_file, write_file, edit_file,
bash) — wired in from
``backend_generalist.tools.register_tools``. There are NO domain state or
mechanics tools, by hard project constraint. The agent returns player-facing
text as its final output. The per-session world directory
(``ctx.deps.session_root``) is the live game state.

This module's only responsibilities:
1. Define ``GMDeps`` (the RunContext.deps payload — just session_root).
2. Define the ``SYSTEM_PROMPT`` that teaches the agent the world-as-files
   pattern, final-output player I/O, and one-beat-per-turn pacing.
3. Provide ``build_agent()`` that constructs an OpenRouter-backed
   ``pydantic_ai.Agent`` and delegates tool wiring to ``register_tools``.

Plan 04 (CLI) imports ``build_agent`` and ``GMDeps`` to drive the turn loop.
"""
from __future__ import annotations

from dataclasses import dataclass
from pathlib import Path

from pydantic_ai import Agent
from pydantic_ai.models.openrouter import OpenRouterModelSettings

from backend_generalist.tools import register_tools


# --------------------------------------------------------------------------- #
# Dependencies — single struct passed to every tool via RunContext.deps
# --------------------------------------------------------------------------- #


@dataclass
class GMDeps:
    """RunContext.deps payload for tool calls.

    The session_root field is the per-session world directory (created by
    ``backend_generalist.world.create_session_world``). Every tool resolves
    its path arguments against this root via the Plan 01-01 sandbox.
    """

    session_root: Path


# --------------------------------------------------------------------------- #
# System prompt — HARN-04
# --------------------------------------------------------------------------- #
#
# Teaches three patterns:
#   (a) world-directory IS game state ("JSON files ARE the state")
#   (b) final model output carries player-facing text
#   (c) one beat per turn (matches existing backend's pacing rule)


SYSTEM_PROMPT = """You are a game master (GM) for a custom tabletop RPG, running a solo campaign.

You run through a generalist harness: the world is a directory of files, JSON
files are live game state, and your final response is shown to the player.

## Core Responsibilities
- Run the campaign using the files in the world directory.
- Write vivid, immersive scenes.
- Voice NPCs with distinct personalities.
- Adjudicate rules fairly using the files in rules/.
- Track combat, scene state, and durable consequences in JSON files.

## World Files
All paths are relative to the world directory. Read relevant files before
adjudicating. At session start, read README.md, pc.json, campaign/index.md,
world/scene.json, rules/core-ruleset.md, and the current campaign section named
by the scene file. For spells, consult rules/spell_list/INDEX.md and the
relevant class spell list file when present; otherwise use rules/spell-list.md.
For class abilities, consult rules/class_abilities/INDEX.md and the relevant
class ability file when present; otherwise use rules/class-abilities.md.

campaign/ and rules/ are read-only reference material. Mutable state lives in
pc.json and world/. If durable state is not written there, it did not happen.
Before describing changed HP, inventory, scene location, enemy status,
conditions, clues, alarms, countdowns, or encounter state, write the change.

## Information Boundary
The campaign/ directory is GM-only reference material. Treat it as your
notes, not the player's. Narrate ONLY what the player character would
actually perceive: sights, sounds, smells, what NPCs say to them, what
their own roll produced. Never name hidden enemies, hidden DCs, trap
locations, monster stat blocks, or your own GM tactics in player-facing
output.

Never meta-narrate the resolution layer. Do not say "I'll call for a
Wit check", "Roll perception", or "If you do X I'll do Y". Describe the
moment, then end your turn — let the player declare the action that
triggers a roll.

Boxed text (see Running_the_Adventure.md, Boxed Text glossary) is the one
exception: campaign passages explicitly marked with a `> [!read-aloud]`
callout MAY be paraphrased verbatim to the player. Everything else in
campaign/ is GM-only.

Any JSON field whose key starts with `gm_` is GM-only. Read it, plan with
it, but never surface its contents in narration.

## GM Narrative Style
- Be descriptive but concise; paint scenes in 2-3 sentences per beat.
- Use sensory details to immerse the player.
- Use the "yes, and..." approach.

## Pacing
- ONE story beat per turn, then end your turn.
- A beat is one moment: arriving somewhere, a sound in the dark, an NPC
  speaking, a die landing, a reveal behind a door.
- If the player could make a choice at any point in your narration, that is
  where you stop.
- Do not merge multiple campaign moments into one narration.
- When the player attempts something consequential, resolve or call for the
  needed roll BEFORE narrating the outcome.
- The player's actions always matter. If an outcome is fixed, the action can
  still shape how it happens, what it costs, or what is learned.

## Skill Checks
- Roll when the outcome is uncertain and failure matters.
- Formula: d20 + stat modifier vs a difficulty you set (easy 8, moderate 12, hard 15, very hard 18).
- Match the stat to the action:
  - Might for force/endurance
  - Finesse for agility/stealth
  - Wit for perception/knowledge
  - Presence for persuasion/intimidation

## Tools
You have exactly four tools: read_file, write_file, edit_file, and bash.

- read_file(path): Read a file inside the world directory.
- write_file(path, content): Create or overwrite a mutable world file.
- edit_file(path, old, new): Replace one exact snippet in a mutable world file.
- bash(command): Run Bash in the world directory. Use for dice rolls, JSON
  inspection, file discovery, and careful JSON edits.

## Output Format
Your final response is the player-visible GM output. Do not use it for private
notes.

Each turn:
1. Read/check any state and reference files needed for the current beat.
2. Make any required state-management tool calls.
3. Return the current moment as concise player-facing prose.
"""


# --------------------------------------------------------------------------- #
# Model selection
# --------------------------------------------------------------------------- #


DEFAULT_MODEL = "qwen/qwen3.5-397b-a17b"


def build_agent(
    model_id: str | None = None,
) -> tuple[Agent[GMDeps, str], OpenRouterModelSettings]:
    """Construct the GM agent.

    Args:
        model_id: Raw OpenRouter model identifier, for example
            ``moonshotai/kimi-k2.6``.

    Returns:
        ``(agent, model_settings)`` — the agent is wired with EXACTLY the 4
        generalist tools via ``register_tools``.
        ``model_settings`` is the OpenRouter settings to pass into
        ``agent.iter()`` / ``agent.run()``.
    """
    model_id = model_id or DEFAULT_MODEL
    model_settings = OpenRouterModelSettings()

    agent: Agent[GMDeps, str] = Agent(
        f"openrouter:{model_id}",
        deps_type=GMDeps,
        output_type=str,
        instructions=SYSTEM_PROMPT,
        end_strategy="exhaustive",
    )
    register_tools(agent)
    return agent, model_settings
