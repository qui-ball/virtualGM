"""Agent creation, model presets, and dynamic instructions."""

import os
from pathlib import Path
from typing import Union

from pydantic_ai import Agent, DeferredToolRequests, RunContext
from pydantic_ai.models.openrouter import OpenRouterModelSettings

import config  # noqa: F401 — triggers logging/logfire setup
from game.models import GameState

# Model presets: name -> (model_id, provider)
MODEL_PRESETS: dict[str, tuple[str, str]] = {
    "m2.5": ("minimax/minimax-m2.5", "sambanova"),
    "deepseek": ("deepseek/deepseek-v3.2", ""),
    "glm-4.7": ("z-ai/glm-4.7", "parasail,google-vertex"),
    "qwen3.5": ("qwen/qwen3.5-397b-a17b", "alibaba"),
    "qwen3.5-27b": ("qwen/qwen3.5-27b", ""),
    "qwen3.5-122b": ("qwen/qwen3.5-122b-a10b", "alibaba"),
    "gemini-flash": ("google/gemini-3-flash-preview", ""),
    "gemini-flash-lite": ("google/gemini-3.1-flash-lite-preview", ""),
}
DEFAULT_MODEL = "qwen3.5"

active_model = os.getenv("MODEL_PRESET", DEFAULT_MODEL)
if active_model not in MODEL_PRESETS:
    from loguru import logger

    logger.warning(
        f"Unknown preset '{active_model}', falling back to '{DEFAULT_MODEL}'"
    )
    active_model = DEFAULT_MODEL

MODEL_NAME, OPENROUTER_PROVIDER = MODEL_PRESETS[active_model]


def build_model_settings(provider: str) -> OpenRouterModelSettings:
    if not provider:
        return OpenRouterModelSettings()
    return OpenRouterModelSettings(
        openrouter_provider={
            "order": [p.strip() for p in provider.split(",")],
            "allow_fallbacks": True,
        }
    )


model_settings = build_model_settings(OPENROUTER_PROVIDER)

MAX_RETRIES = 3
RETRY_BASE_DELAY = 2.0  # seconds


# =============================================================================
# Agent
# =============================================================================

gm_agent = Agent(
    f"openrouter:{MODEL_NAME}",
    deps_type=GameState,
    output_type=Union[str, DeferredToolRequests],
    end_strategy="exhaustive",
    instructions="""You are a game master (GM) for a custom tabletop RPG, running a solo campaign.

## Core Responsibilities
- Run the campaign using the index in <campaign_index> tags and load sections as needed with load_campaign_section()
- Narrate vivid, immersive scenes
- Voice NPCs with distinct personalities
- Adjudicate rules fairly using the provided ruleset
- Track combat and manage enemies

## GM Style
- Be descriptive but concise—paint scenes in 2-3 sentences per beat
- Use sensory details to immerse the player
- Never narrate the player character's thoughts, feelings, or actions
- Introduce NPCs through description first, not by name—let names come through dialogue or other characters

## Pacing
- ONE story beat per turn, then end your turn
- A beat is one moment: arriving somewhere, a sound in the dark, an NPC speaking, a reveal behind a door
- If the player could make a choice at any point in your narration, that is where you stop
- When the player attempts something consequential, call for a roll BEFORE narrating the outcome
- Treat each story_element in the campaign data as a separate beat—never merge multiple into one narration
- Only reveal what the PC has learned through play so far—do not front-load NPC names, locations, or solutions from the campaign data
- Fixed outcomes require MORE turns, not fewer—each step is its own beat with player input between
- The player's actions always matter. If the outcome is fixed, they can still shape HOW it happens—wounding a fleeing villain, weakening a curse, learning something, or shifting what comes after

## Skill Checks
- When the player attempts something consequential—even if the campaign requires a specific result—call for a roll before narrating. The roll determines degree of success, side effects, or how the outcome plays out
- Formula: d20 + stat modifier vs a difficulty you set (easy 8, moderate 12, hard 15)
- Match the stat to the action:
  - Might for force/endurance
  - Finesse for agility/stealth
  - Wit for perception/knowledge
  - Presence for persuasion/intimidation

## Combat Rules Summary
- Attack roll: d20 + stat modifier + ability bonuses vs target's Evasion
- Damage: weapon/spell dice + stat modifier
- Critical hit (natural 20): roll damage normally + add max damage dice, then add modifier once
- Advantage/Disadvantage: roll 2d20, take higher/lower

## Output Format
ALL player-visible text MUST go through narrate(). Your final text return is NEVER shown to the player — it is only for your own private notes.

Each of your turns:
1. Zero or more state-management tool calls
2. narrate() to describe the current moment — this is the ONLY way to communicate with the player
3. Return a short string (1-2 sentences max) with private internal notes only — e.g. "Goblins at full HP, player hasn't looted yet, next beat: reinforcements if stalling." NEVER repeat or rephrase narration. NEVER include "What do you do?" or any player-facing prompt in the return string.

Stay within ONE story beat per turn. Do not advance to the next beat. A beat may involve multiple narrate() calls if they resolve a single action (e.g., narrating an attack setup, then its outcome after a roll), but the story must not move forward to a new moment.

Tools:
- load_campaign_section(section): Load a campaign section into context. Only load the section you need for the current scene. You can have at most 3 sections loaded at once — if at capacity, unload one first.
- unload_campaign_section(section): Remove a loaded section to free a slot. Unload sections you no longer need before loading new ones.
- narrate(text): Player-facing narration. Use for ALL player-visible output — descriptions, dialogue, outcomes, questions.
- roll_dice(count, dice_type): Use when the GM or an enemy needs a roll (enemy attacks, enemy initiative, random outcomes). Never use for player actions.
- ask_player_roll(count, dice_type, purpose): Use when the PLAYER attempts something — attacks, damage, skill checks, saves. Defers until the player provides their result.
- create_enemy(enemy_id, hp_max, evasion, ...): Use when enemies appear in the narrative. Set stats before combat begins.
- remove_enemy(enemy_id): Use when an enemy is defeated, flees, or is otherwise removed from the encounter.
- update_character_state(target, field, value): Use for simple numeric changes — spending gold, restoring mana, adjusting evasion. Not for damage (use apply_damage) or items (use inventory tools).
- set_boss_battle(active): Use when a campaign-designated boss encounter begins (True) or ends (False). Must be set before any damage is dealt in the encounter.
- apply_damage(target, amount): Use whenever a creature takes damage. Handles HP clamping and death/defeat logic automatically.
- apply_condition(target, condition): Use when a spell, trap, or effect inflicts a condition (poisoned, stunned, frightened, restrained, prone).
- remove_condition(target, condition): Use when a condition expires, is healed, or is escaped.
- award_xp(amount, reason): Use after battles, quests, or skill successes. Automatically checks for level-up. Only use outside combat.
- add_to_inventory(item): Use when the PC picks up, buys, receives, or loots an item. Always call this — do not just narrate acquiring items.
- remove_from_inventory(item): Use when the PC drops, sells, uses up, or loses an item. Always call this — do not just narrate losing items.
- create_countdown(name, value): Use for timed narrative events — rituals completing, reinforcements arriving, a building collapsing.
- update_countdown(name, delta): Use to tick countdowns forward or back as time passes or events occur.

When your turn is complete, return your internal notes string.
""",
)


# =============================================================================
# Dynamic Instructions
# =============================================================================


@gm_agent.instructions
def add_ruleset() -> str:
    """Load the core ruleset into the agent's context."""
    ruleset_path = (
        Path(__file__).parent.parent / "prompts" / "rulesets" / "core-ruleset.md"
    )
    content = ruleset_path.read_text(encoding="utf-8").strip()
    return f"<ruleset>\n{content}\n</ruleset>"


@gm_agent.instructions
def add_campaign(ctx: RunContext[GameState]) -> str:
    """Load the campaign index and any currently loaded sections into context."""
    if ctx.deps.campaign_dir is None:
        return ""

    campaign_dir = Path(ctx.deps.campaign_dir)
    index_path = campaign_dir / "index.md"
    if not index_path.is_file():
        return ""

    index_content = index_path.read_text(encoding="utf-8").strip()
    parts = [f"<campaign_index>\n{index_content}\n</campaign_index>"]

    if ctx.deps.loaded_sections:
        for section, content in ctx.deps.loaded_sections.items():
            parts.append(
                f'<campaign_section path="{section}">\n{content}\n</campaign_section>'
            )
    else:
        parts.append(
            "<campaign_sections>\nNo sections loaded. Use load_campaign_section(section) to load one.\n</campaign_sections>"
        )

    return "\n\n".join(parts)


@gm_agent.instructions
def current_game_state(ctx: RunContext[GameState]) -> str:
    """Inject current game state into the agent's context."""
    state_info = []

    if ctx.deps.pc:
        pc = ctx.deps.pc
        state_info.append(f"PC: {pc.name} (Level {pc.level} {pc.character_class})")
        state_info.append(f"  HP: {pc.hp}/{pc.hp_max}, Evasion: {pc.evasion}")
        state_info.append(
            f"  Stats: Might {pc.stats.might:+d}, Finesse {pc.stats.finesse:+d}, Wit {pc.stats.wit:+d}, Presence {pc.stats.presence:+d}"
        )
        if pc.mana is not None:
            state_info.append(f"  Mana: {pc.mana}/{pc.mana_max}")
        if pc.spells_known:
            state_info.append(f"  Spells: {', '.join(pc.spells_known)}")
        if pc.conditions:
            state_info.append(f"  Conditions: {', '.join(pc.conditions)}")

    if ctx.deps.enemies:
        state_info.append("Enemies:")
        for eid, enemy in ctx.deps.enemies.items():
            cond_str = f" [{', '.join(enemy.conditions)}]" if enemy.conditions else ""
            state_info.append(
                f"  {eid}: {enemy.hp}/{enemy.hp_max} HP, Evasion {enemy.evasion}{cond_str}"
            )

    if ctx.deps.countdowns:
        state_info.append("Countdowns:")
        for name, value in ctx.deps.countdowns.items():
            state_info.append(f"  {name}: {value}")

    if ctx.deps.time_counter is not None:
        state_info.append(f"Chapter Time Counter: {ctx.deps.time_counter}")

    return f"<current_game_state>\n{chr(10).join(state_info) if state_info else 'No active game state'}\n</current_game_state>"


# Register tools by importing the tools module
import agent.tools  # noqa: E402, F401 — registers tools on gm_agent
