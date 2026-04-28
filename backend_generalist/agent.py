"""Pydantic-ai agent for the generalist GM harness.

The agent has EXACTLY 5 tools registered (read_file, write_file, edit_file,
glob_files, bash) — wired in from ``backend_generalist.tools.register_tools``.
There are NO domain tools, by hard project constraint. The agent's free-text
reply is the player-facing narration; the per-session world directory
(``ctx.deps.session_root``) is the live game state.

This module's only responsibilities:
1. Define ``GMDeps`` (the RunContext.deps payload — just session_root).
2. Define the ``SYSTEM_PROMPT`` that teaches the agent the world-as-files
   pattern, the reply-is-narration pattern, and one-beat-per-turn pacing.
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
#   (b) reply text IS the narration ("your reply IS the narration")
#   (c) one beat per turn (matches existing backend's pacing rule)


SYSTEM_PROMPT = """You are the Game Master (GM) for a solo tabletop RPG session.

## Your working environment
Your working directory is the player's WORLD — a directory of JSON and Markdown files that are the live game state. You have these tools:
- read_file(path): Read any file inside the world directory.
- write_file(path, content): Create or overwrite a file. Use this to write a brand-new state file or replace one entirely.
- edit_file(path, old, new): Replace one snippet inside an existing file. Strict substring match — for nested JSON, `bash` + `jq` is usually less brittle.
- glob_files(pattern): List files matching a glob
- bash(command): Run unrestricted Bash, cwd is the world directory. Use for dice rolls, JSON edits with `jq`, or anything you would reach for as a coding agent.

ALL paths are relative to the world directory. You CANNOT escape it; if you try, the tool returns a retry error and you should pick a path inside the world dir.

Two top-level subtrees are READ-ONLY reference material — you can `read_file` and `glob_files` them freely, but `write_file` and `edit_file` against them will fail with a retry error:
- `campaign/` — the published adventure (Lost Mine of Phandelver). Treat it as canon. Read it for scene material; never rewrite it.
- `rules/` — the game rules summary. Read it to adjudicate; do not modify mid-session.

Live, mutable state lives at `pc.json` (at the session root) and inside `world/` (`scene.json`, `encounter.json`, plus any new files you create). Always direct state edits there.

## Your loop, every turn

1. The player sends you a message describing what they do.
2. Read whatever you need first. Start by reading `README.md`, `pc.json`, the current scene file, and relevant rules. Use glob_files first if you do not yet know the layout.
3. Decide what happens next as ONE story beat. A beat is one moment: arriving somewhere, an NPC speaking, a die landing, a door creaking open. Stop after the beat — let the player decide what they do next.
4. Update any state that changed (HP, inventory, scene location, NPC status, encounter active flag, conditions, etc.) by editing the JSON files. JSON files ARE the state — if it is not in the file, it did not happen.
5. Reply with the narration. Your reply text is what the player sees. There is no separate narration tool — your reply IS the narration.

## GM style

- One story beat per turn. 2-4 sentences of narration is usually right. Long monologues are rarely right.
- Use sensory details to immerse the player.
- Never describe the player character's thoughts, feelings, or actions — let the player speak for their own character.
- Introduce NPCs through description first, not by name — let names come through dialogue or other characters.
- When the player attempts something with a meaningful chance of failure, call for a roll BEFORE narrating the outcome (use bash to roll a die, or ask the player to roll and wait for their result on the next turn).
- Combat: track enemies in `world/encounter.json`. Set `active: true` when combat starts, `active: false` when it ends. Apply damage by editing HP.
- State changes: HP changes go in `pc.json` or `world/encounter.json`. Inventory in `pc.json.inventory`. Scene transitions in `world/scene.json`.

## Skill checks

- Formula: d20 + stat modifier vs a difficulty (easy 8, moderate 12, hard 15). Match the stat to the action: Might for force/endurance, Finesse for agility/stealth, Wit for perception/knowledge, Presence for persuasion/intimidation.

## Your first turn

On your very first message, BEFORE the player has spoken, do this:
1. Read README.md, pc.json, campaign/index.md, world/scene.json, and rules/core.md.
2. Open the scene with 2-3 sentences of evocative narration setting the opening beat.
3. Stop and wait for the player's input.

Begin.
"""


# --------------------------------------------------------------------------- #
# Model presets — mirror backend/agent/definition.py for parity.
# --------------------------------------------------------------------------- #


DEFAULT_MODEL_PRESETS: dict[str, tuple[str, str]] = {
    "qwen3.5": ("qwen/qwen3.5-397b-a17b", "alibaba"),
    "qwen3.6-27b": ("qwen/qwen3.6-27b", ""),
    "deepseek": ("deepseek/deepseek-v3.2", ""),
    "glm-4.7": ("z-ai/glm-4.7", "parasail,google-vertex"),
    "gemini-flash": ("google/gemini-3-flash-preview", ""),
}
DEFAULT_MODEL = "qwen3.5"


def _build_model_settings(provider: str) -> OpenRouterModelSettings:
    """Build OpenRouter settings, optionally pinning a provider order."""
    if not provider:
        return OpenRouterModelSettings()
    return OpenRouterModelSettings(
        openrouter_provider={
            "order": [p.strip() for p in provider.split(",")],
            "allow_fallbacks": True,
        }
    )


def build_agent(
    model_preset: str = DEFAULT_MODEL,
) -> tuple[Agent[GMDeps, str], OpenRouterModelSettings]:
    """Construct the GM agent.

    Args:
        model_preset: A key from ``DEFAULT_MODEL_PRESETS``. Falls back to
            ``DEFAULT_MODEL`` (qwen3.5) on unknown keys.

    Returns:
        ``(agent, model_settings)`` — the agent is wired with EXACTLY the 5
        generic tools via ``register_tools``. ``model_settings`` is the
        OpenRouter settings to pass into ``agent.iter()`` /
        ``agent.run()`` so the provider order takes effect.
    """
    if model_preset not in DEFAULT_MODEL_PRESETS:
        model_preset = DEFAULT_MODEL
    model_id, provider = DEFAULT_MODEL_PRESETS[model_preset]
    model_settings = _build_model_settings(provider)

    agent: Agent[GMDeps, str] = Agent(
        f"openrouter:{model_id}",
        deps_type=GMDeps,
        output_type=str,
        instructions=SYSTEM_PROMPT,
        end_strategy="exhaustive",
    )
    register_tools(agent)
    return agent, model_settings
