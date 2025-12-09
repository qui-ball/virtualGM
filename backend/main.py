"""Basic Pydantic AI agent implementation for LLM GM testing."""

import asyncio
import os
import random
import sys
from pathlib import Path
from typing import Literal, Union

import click
import dotenv
import logfire
from loguru import logger
from pydantic import BaseModel, Field, model_validator
from pydantic_ai import (
    Agent,
    ModelRetry,
    RunContext,
    CallDeferred,
    DeferredToolRequests,
    DeferredToolResults,
)
from pydantic_ai.models.openai import OpenAIChatModel
from pydantic_ai.models.openrouter import OpenRouterModel
from pydantic_ai.providers.deepseek import DeepSeekProvider
from utils.cost import calculate_run_cost

dotenv.load_dotenv()


# ANSI color codes for terminal output
class Colors:
    """ANSI color codes for terminal output."""

    GREEN = "\033[32m"
    BLUE = "\033[34m"
    LIGHT_BLACK = "\033[90m"  # Pale grey
    RESET = "\033[0m"


# Configure loguru logging level
# Set LOGURU_LEVEL environment variable to control logging (default: INFO, set to DEBUG to see debug messages)
loguru_level = os.getenv("LOGURU_LEVEL", "INFO").upper()
logger.remove()  # Remove default handler
logger.add(
    sys.stderr,
    level=loguru_level,
    colorize=True,
    format="<green>{time:HH:mm:ss}</green> | <level>{level: <8}</level> | <cyan>{name}</cyan>:<cyan>{function}</cyan> - <level>{message}</level>",
)

# Configure Logfire from environment variables
# Logfire automatically reads LOGFIRE_TOKEN from environment if set
logfire_token = os.getenv("LOGFIRE_TOKEN")
logfire_environment = os.getenv("LOGFIRE_ENVIRONMENT", "development")

if logfire_token:
    logfire.configure(
        token=logfire_token,
        environment=logfire_environment,
    )
else:
    # Logfire is optional - continue without it if token is not provided
    logfire.configure(send_to_logfire=False)

# Instrument pydantic-ai for observability - must be called after configure
logfire.instrument_pydantic_ai()

# # Get API key from environment variable (set OPENROUTER_API_KEY)
# api_key = os.getenv("OPENROUTER_API_KEY")

# if not api_key:
#     raise ValueError("Please set OPENROUTER_API_KEY environment variable")

# Standard RPG dice types
DiceType = Literal["d4", "d6", "d8", "d10", "d12", "d20", "d100"]

DICE_SIDES: dict[DiceType, int] = {
    "d4": 4,
    "d6": 6,
    "d8": 8,
    "d10": 10,
    "d12": 12,
    "d20": 20,
    "d100": 100,
}


class DiceRollResult(BaseModel):
    """Result of a dice roll."""

    dice_type: DiceType
    rolls: list[int]
    total: int


class CharacterState(BaseModel):
    """Character state for both PCs and NPCs/adversaries."""

    # HP and Stress (common to all characters)
    hp: int | None = Field(
        default=None,
        ge=0,
        description="Current HP remaining (None = full health/hp_max, 0 = defeated, decreases when taking damage)",
    )
    hp_max: int = Field(ge=1, description="Maximum HP")
    stress: int = Field(
        default=0,
        ge=0,
        description="Current Stress (increases when marking stress, max is stress_max)",
    )
    stress_max: int = Field(ge=0, description="Maximum Stress")

    # Damage thresholds (common to all characters)
    minor_threshold: int = Field(ge=0, description="Damage threshold for marking 1 HP")
    major_threshold: int = Field(ge=0, description="Damage threshold for marking 2 HP")
    severe_threshold: int | None = Field(
        default=None,
        ge=0,
        description="Damage threshold for marking 3 HP (None means no severe threshold)",
    )

    # Conditions
    conditions: list[str] = Field(
        default_factory=list,
        description="Active conditions (Vulnerable, Restrained, Hidden, etc.)",
    )

    # PC-specific fields (optional for NPCs)
    hope: int | None = Field(
        default=None, ge=0, le=6, description="Current Hope (PCs only, max 6)"
    )
    armor_slots: int | None = Field(
        default=None,
        ge=0,
        description="Current armor slots remaining (PCs only, decreases when used)",
    )
    armor_slots_max: int | None = Field(
        default=None, ge=0, description="Total armor slots (PCs only)"
    )
    evasion: int | None = Field(
        default=None, ge=0, description="Evasion value (PCs only, for being attacked)"
    )
    experiences: dict[str, int] | None = Field(
        default=None,
        description="PC Experiences: name -> modifier (e.g., {'Royal Mage': 2, 'Not On My Watch': 2})",
    )

    # NPC-specific fields (optional for PCs)
    difficulty: int | None = Field(
        default=None,
        ge=0,
        description="Difficulty value (NPCs only, for attack rolls against them)",
    )
    attack_modifier: int | None = Field(
        default=None, description="Attack modifier for adversary attacks (NPCs only)"
    )

    @model_validator(mode="after")
    def set_default_hp(self) -> "CharacterState":
        """Set hp to hp_max if hp is None (not explicitly set)."""
        if self.hp is None and self.hp_max > 0:
            self.hp = self.hp_max
        return self


class EndGameMasterTurn(BaseModel):
    """Signals the end of the GM's turn and the start of the player's turn."""

    notes: str | None = Field(
        default=None, description="GM's private notes for continuity"
    )  # GM's private notes for continuity


class GameState:
    """Mutable game state shared across tool calls."""

    def __init__(self):
        self.fear_pool: int = 1  # GM starts with 1 Fear token for each PC
        # Initialize PC state with Marlowe's stats
        self.pc: CharacterState = CharacterState(
            hp=6,  # Start at full HP
            hp_max=6,  # Marlowe has 6 HP max
            stress=0,  # Start with no stress
            stress_max=6,  # All PCs start with 6 Stress max
            minor_threshold=7,  # Minor: 7 (Mark 1 HP)
            major_threshold=14,  # Major: 14 (Mark 2 HP)
            severe_threshold=None,  # No severe threshold listed
            hope=2,  # PCs start with 2 Hope
            armor_slots=3,  # Start with 3/3 armor slots (like HP)
            armor_slots_max=3,  # Leather Armor has 3 armor slots
            evasion=10,  # Marlowe's Evasion is 10
            experiences={
                "Royal Mage": 2,
                "Not On My Watch": 2,
            },  # Marlowe's Experiences
        )
        self.adversaries: dict[str, CharacterState] = {}  # Adversary name -> state
        self.countdowns: dict[str, int] = {}  # Countdown name -> current value


# # Initialize the OpenRouter model (prompt caching is enabled by default on OpenRouter)
# # Available DeepSeek models on OpenRouter via Fireworks:
# # - deepseek/deepseek-chat-v3.1 (V3.1 - recommended)
# # - deepseek/deepseek-chat-v3-0324 (V3 March 2024 checkpoint)
# # - deepseek/deepseek-r1-0528 (R1 reasoning model)
# # model_name = "deepseek/deepseek-chat-v3.1"
# model_name = "deepseek/deepseek-v3.2"
# # model_name = "anthropic/claude-haiku-4.5"
# # model_name = "moonshotai/kimi-k2-0905"
# # model_name = "openai/gpt-4.1-mini"
# # model_name = "mistralai/mistral-large-2512"
# # model_name = "google/gemini-2.5-flash-preview-09-2025"
# # model_name = "openai/gpt-oss-120b"  # Has potential, but gets tool calling wrong
# # model_name = "meta-llama/llama-3.1-405b-instruct"
# # model_name = (
# #     "qwen/qwen3-235b-a22b-2507"  # Has potential, but stops after some tool calls
# # )
# model_name = "x-ai/grok-4.1-fast"
# model_name = "meta-llama/llama-3.3-70b-instruct:free"
# model_name = "qwen/qwen3-coder-30b-a3b-instruct"
# model_name = "openai/gpt-5.1-codex-mini"
# model_name = "openai/gpt-oss-120b:exacto"
# model_name = "qwen/qwen3-235b-a22b-thinking-2507"
# model_name = "openai/gpt-oss-20b"
# model_name = "z-ai/glm-4.5-air"  # output format is wrong
# model_name = "minimax/minimax-m2"
# model_name = "mistralai/mistral-large-2512"
# model = OpenRouterModel(model_name)

# Use DeepSeek API directly (set DEEPSEEK_API_KEY environment variable)
model_name = "deepseek-chat"
model = OpenAIChatModel(model_name, provider=DeepSeekProvider())

# from pydantic_ai.providers.grok import GrokProvider

# model = OpenAIChatModel(
#     "grok:grok-4-1-fast-reasoning",
#     provider=GrokProvider(),
# )

# model = "grok:grok-4-1-fast-reasoning"
# model = "grok:grok-4-1"
# model = "grok:grok-code-fast-1"

# # Self-hosted vLLM
# from pydantic_ai.providers.openai import OpenAIProvider

# model_name = "openai/gpt-oss-20b"
# model = OpenAIChatModel(
#     model_name,
#     provider=OpenAIProvider(
#         base_url="https://vllm.bilunsun.dev/v1",
#         api_key=os.getenv(
#             "VLLM_API_KEY", ""
#         ),  # Set env var or use empty string if no auth
#     ),
# )

# TOOD: Combine roll_dice and player_roll_dice into a single tool
# TODO: Combine player_take_damage and update_character_state into a single tool
# TODO: Spotlight shift state tracking

# Create an agent with the OpenRouter model
agent = Agent(
    model,
    deps_type=GameState,
    output_type=Union[EndGameMasterTurn, DeferredToolRequests],
    instructions="""You are a game master (GM) for Daggerheart, running a solo campaign.

## Core Responsibilities
- Narrate vivid, immersive scenes that bring the campaign to life
- Voice NPCs with distinct personalities and motivations
- Adjudicate rules fairly using the provided Daggerheart rules reference
- Track and spend Fear tokens strategically to create tension

## GM Style
- Be descriptive but concise—paint scenes in 2-3 sentences
- Use sensory details (sounds, smells, textures) to immerse the player
- Match tone to the moment: tense during combat, warm during social scenes
- Never narrate the player character's thoughts, feelings, or actions

## Daggerheart Principles
- **Play to find out**: Don't predetermine outcomes—let dice and choices shape the story
- **Make GM moves with purpose**: Use soft moves to build tension, hard moves for consequences
- **Manage the Fear economy**: Spend Fear to interrupt, activate features, or raise stakes

## Tone
- Fantasy adventure suitable for all ages
- Violence can be dramatic but not gratuitous
- Emphasize heroism, wonder, and discovery

## Reference Materials
- <daggerheart_rules> for mechanics and rules
- <campaign_material> for story, NPCs, and encounters
- <player_character> for Marlowe's stats and abilities

## Clarifications
- A critical hit is when the player rolls the same number on both Duality Dice.

<tools>
You communicate exclusively through tool calls. The player only sees output from narrate() and declare(); any text outside of tool calls is invisible to them.

You have access to the following tools:
- narrate(text): Story, fiction, dialogue, descriptions, atmosphere, prompts. Anything the characters experience or say.
- declare(text): Math only. Numbers, calculations, mechanical outcomes. Example: "15 + 1 = 16 vs Evasion 10 — hit!" or "You mark 1 HP (5/6)"
- roll_dice(count, type): Roll dice for GM/adversary actions only (e.g., adversary attacks, NPC actions). Do NOT use this for player actions.
- player_propose_action(): Ask the player how they want to approach an action and if they want to propose an Experience.
  - Use this BEFORE player_roll_dice when the player attempts something that could use an Experience.
  - Returns the player's approach description and any Experience proposal with explanation.
  - Hope is NOT spent yet—you must validate the Experience first.
  - After receiving the proposal, decide the trait and whether the Experience applies, then call player_roll_dice.
- player_roll_dice(count, type, approved_experience=None): Request the player to roll dice.
  - For Duality Dice: Always roll as a pair, i.e. player_roll_dice(2, "d12").
  - If you validated an Experience from player_propose_action, pass approved_experience="Experience Name" to apply it.
  - Hope is spent automatically when approved_experience is provided.
  - If no Experience or you rejected the proposal, omit approved_experience or pass None.
  - NEGOTIATION: The player can reject your ruling before rolling. If the result starts with "NEGOTIATION:",
    the player is pushing back. Consider their argument, then call player_roll_dice again with your revised (or unchanged) ruling.
- player_take_damage(damage): Apply damage to the PC. The player will be prompted to use armor slots before HP is marked.
  - ALWAYS use this instead of update_character_state when the PC takes damage.
  - Narrate the attack and raw damage amount, then call this tool. Do NOT narrate the HP loss—the tool result will tell you what happened.
- spend_fear(amount): Spend Fear tokens to take spotlight actions or activate GM abilities.
- create_adversary(id, state): Create an adversary with stats (HP, thresholds, difficulty, etc.)
- remove_adversary(id): Remove a defeated adversary from the game state
- update_character_state(target, delta): Update adversary state (HP, Stress, conditions) or PC state for non-damage changes (Hope, Stress, conditions). Do NOT use for PC damage—use player_take_damage instead.
  - Delta values are relative changes: hope=+1 adds Hope, hope=-1 spends Hope, hp=-2 reduces HP by 2. Omit fields you don't want to change.
- create_countdown(name, initial_value): Create a new countdown tracker with an initial value
- update_countdown(name, delta): Update an existing countdown tracker by applying a delta (change value)
  - delta: Change to apply (e.g., -1 to tick down, +1 to tick up)
  - Only works on existing countdowns (use create_countdown first)
  - When a countdown reaches 0, its effect triggers (ritual completes, reinforcements arrive, etc.)
</tools>
""",
)


@agent.tool
def roll_dice(ctx: RunContext[GameState], dice_count: int, dice_type: DiceType) -> str:
    """Roll dice for GM/adversary actions only (e.g., adversary attacks, NPC actions). Players roll their own dice using player_roll_dice.

    Args:
        dice_count: Number of dice to roll
        dice_type: Type of die (d4, d6, d8, d10, d12, d20, d100)
    """
    # Duality Dice (2d12) are always rolled by the player, not the GM
    if dice_count == 2 and dice_type == "d12":
        raise ModelRetry(
            "Duality Dice (2d12) must always be rolled by the player. "
            "Use player_roll_dice(2, 'd12') instead of roll_dice. "
            "Duality Dice are used for player action rolls and checks."
        )
    sides = DICE_SIDES[dice_type]
    rolls = [random.randint(1, sides) for _ in range(dice_count)]

    # Display the roll
    if len(rolls) == 1:
        result_str = f"🎲 [{dice_count}{dice_type}] → {rolls[0]}"
        logger.info(result_str)
    # The GM doesn't roll Duality Dice, so we don't need to handle them here
    # elif len(rolls) == 2 and dice_type == "d12":
    #     # Special formatting for Hope/Fear dice (Duality Dice)
    #     hope, fear = rolls
    #     result_str = f"🎲 [2d12 Duality Dice] → Hope:{hope} Fear:{fear}"
    #     logger.info(result_str)
    #     # Track Fear when Fear die is higher
    #     if fear > hope:
    #         ctx.deps.fear_pool += 1
    #         logger.info(f"   😈 Fear pool: {ctx.deps.fear_pool}")
    #         result_str += "; Fear is higher, so the GM gains 1 Fear and the spotlight will shift to the GM after the player's action."
    else:
        result_str = f"🎲 [{dice_count}{dice_type}] → {rolls} = {sum(rolls)}"
        logger.info(result_str)

    return result_str


@agent.tool
def player_propose_action(ctx: RunContext[GameState]) -> str:
    """Ask the player how they want to approach an action, and if they want to propose using an Experience.

    Use this BEFORE calling player_roll_dice when the player attempts something that could use an Experience.
    The player will describe their approach and optionally propose an Experience with an explanation.
    You must then validate the Experience before calling player_roll_dice.

    Returns the player's approach and any Experience proposal (Hope is NOT spent yet).
    """
    raise CallDeferred(metadata={"tool": "player_propose_action"})


@agent.tool
def player_roll_dice(
    ctx: RunContext[GameState],
    dice_count: int,
    dice_type: DiceType,
    approved_experience: str | None = None,
) -> str:
    """Request the player to roll dice. This defers execution until the player provides their roll result.

    Args:
        dice_count: Number of dice to roll
        dice_type: Type of die (d4, d6, d8, d10, d12, d20, d100)
        approved_experience: Name of an Experience you validated and approved (e.g., "Streetwise Informant").
                            If provided, 1 Hope will be spent and the Experience bonus applied.
                            If None or omitted, no Experience is used.
    """
    raise CallDeferred(
        metadata={
            "tool": "player_roll_dice",
            "dice_count": dice_count,
            "dice_type": dice_type,
            "approved_experience": approved_experience,
        }
    )


@agent.tool
def player_take_damage(ctx: RunContext[GameState], damage: int) -> str:
    """Apply damage to the player character. This defers execution to let the player decide whether to use armor slots.

    The player will be prompted to use armor slots (if available) to reduce damage before HP is marked.
    Damage thresholds determine HP marked: < Minor = 1 HP, >= Minor = 2 HP, >= Major = 2 HP, >= Severe = 3 HP.

    Args:
        damage: The raw damage amount to apply (before armor reduction)
    """
    raise CallDeferred(metadata={"tool": "player_take_damage", "damage": damage})


@agent.tool_plain
def narrate(narration: str) -> None:
    """Send narrative text to the player—descriptions, dialogue, atmosphere.

    Args:
        narration: Immersive storytelling content (scene descriptions, NPC dialogue, sensory details).
    """
    logger.info(f"{Colors.GREEN}{narration}{Colors.RESET}")


@agent.tool_plain
def declare(ruling: str) -> None:
    """Announce mechanical results, calculations, and rules to the player.

    Args:
        ruling: Mechanical announcements (roll results, hit/miss, damage calculations, threshold checks, Hope/Fear outcomes).
    """
    logger.info(f"{Colors.BLUE}{ruling}{Colors.RESET}")


@agent.tool
def spend_fear(ctx: RunContext[GameState], amount: int = 1) -> str:
    """Spend Fear tokens from the GM's pool to activate abilities or take spotlight actions.

    Args:
        amount: Number of Fear tokens to spend (default 1)
    """
    if ctx.deps.fear_pool >= amount:
        ctx.deps.fear_pool -= amount
        logger.info(f"   😈 Spent {amount} Fear. Remaining: {ctx.deps.fear_pool}")
        return f"Spent {amount} Fear. Remaining: {ctx.deps.fear_pool}"
    else:
        logger.warning(f"   ⚠️ Not enough Fear! (pool: {ctx.deps.fear_pool})")
        return f"Cannot spend {amount} Fear. Only {ctx.deps.fear_pool} available."


@agent.tool
def create_adversary(
    ctx: RunContext[GameState], adversary_id: str, adversary_state: CharacterState
) -> str:
    """Create an adversary in the game state.

    Args:
        adversary_id: Unique identifier/name for the adversary (e.g., "Thistlefolk Ambusher 1")
        adversary_state: CharacterState with the adversary's stats (HP, thresholds, difficulty, etc.)
    """
    if adversary_id in ctx.deps.adversaries:
        logger.warning(f"Adversary '{adversary_id}' already exists")
        raise ModelRetry(
            f"Adversary '{adversary_id}' already exists. Use a different adversary_id or remove the existing one first."
        )

    ctx.deps.adversaries[adversary_id] = adversary_state
    logger.info(
        f"Created adversary '{adversary_id}' (HP: {adversary_state.hp}/{adversary_state.hp_max}, Difficulty: {adversary_state.difficulty})"
    )
    return f"Successfully created adversary '{adversary_id}' (HP: {adversary_state.hp}/{adversary_state.hp_max}, Difficulty: {adversary_state.difficulty})"


@agent.tool
def remove_adversary(ctx: RunContext[GameState], adversary_id: str) -> str:
    """Remove an adversary from the game state (typically when defeated).

    Args:
        adversary_id: Unique identifier/name of the adversary to remove
    """
    if adversary_id not in ctx.deps.adversaries:
        logger.warning(f"Adversary '{adversary_id}' not found")
        raise ModelRetry(
            f"Adversary '{adversary_id}' does not exist. Available adversaries: {list(ctx.deps.adversaries.keys())}"
        )

    del ctx.deps.adversaries[adversary_id]
    logger.info(f"Removed adversary '{adversary_id}'")
    return f"Successfully removed adversary '{adversary_id}'"


class CharacterStateDelta(BaseModel):
    """Delta/change to apply to a CharacterState. Values are relative changes (positive to increase, negative to decrease). Only provide fields you want to change."""

    hp: int | None = Field(
        default=None,
        description="Change to HP (e.g., -2 to reduce HP by 2, +3 to increase HP by 3)",
    )
    stress: int | None = Field(
        default=None,
        description="Change to Stress (e.g., -1 to reduce stress by 1, +2 to increase stress by 2)",
    )
    add_conditions: list[str] | None = Field(
        default=None,
        description="Conditions to add (e.g., ['Vulnerable', 'Restrained'])",
    )
    remove_conditions: list[str] | None = Field(
        default=None, description="Conditions to remove (e.g., ['Vulnerable'])"
    )
    hope: int | None = Field(
        default=None,
        description="Change to Hope (e.g., -1 to reduce hope by 1, +2 to increase hope by 2, PCs only)",
    )
    armor_slots: int | None = Field(
        default=None,
        description="Change to armor slots (e.g., -1 to use an armor slot, +1 to restore, PCs only)",
    )


@agent.tool
def update_character_state(
    ctx: RunContext[GameState],
    target: str,
    delta: CharacterStateDelta,
) -> str:
    """Update character state for PC or an adversary by applying deltas (relative changes).

    Args:
        target: "pc" for player character, or adversary_id for an adversary
        delta: CharacterStateDelta with relative changes to apply (e.g., hp=-2 to reduce HP by 2, hope=+1 to gain 1 Hope). Values are added to current state, not set absolutely.
    """
    logger.info(
        f"{Colors.LIGHT_BLACK}Updating character state for {target}: {delta.__dict__}{Colors.RESET}"
    )
    if target == "pc":
        character = ctx.deps.pc
        character_name = "PC"
        # Check if trying to reduce PC HP (damage) - must use player_take_damage instead
        if delta.hp is not None and delta.hp < 0:
            raise ModelRetry(
                "You cannot use update_character_state to reduce the PC's HP (apply damage). "
                "Instead, use player_take_damage(damage) which allows the player to choose whether to use armor slots before HP is marked. "
                "Narrate the attack and raw damage amount, then call player_take_damage with the damage value."
            )
    elif target in ctx.deps.adversaries:
        character = ctx.deps.adversaries[target]
        character_name = f"adversary '{target}'"
    else:
        logger.warning(f"Target '{target}' not found")
        raise ModelRetry(
            f"Target '{target}' does not exist. Use 'pc' for player character, or one of: {list(ctx.deps.adversaries.keys())}"
        )

    # Check if all deltas are 0 or None (no actual changes)
    all_zero = (
        (delta.hp is None or delta.hp == 0)
        and (delta.stress is None or delta.stress == 0)
        and (delta.hope is None or delta.hope == 0)
        and (delta.armor_slots is None or delta.armor_slots == 0)
        and (delta.add_conditions is None or len(delta.add_conditions) == 0)
        and (delta.remove_conditions is None or len(delta.remove_conditions) == 0)
    )

    if all_zero:
        return f"No changes to apply for {character_name} - all delta values are 0 or None."

    updated_fields = []
    if delta.hp is not None and delta.hp != 0:
        character.hp = max(
            0, character.hp + delta.hp
        )  # Apply delta, ensure non-negative
        updated_fields.append(
            f"hp={delta.hp:+d} (now {character.hp}/{character.hp_max})"
        )
    if delta.stress is not None and delta.stress != 0:
        new_stress = max(
            0, character.stress + delta.stress
        )  # Apply delta, ensure non-negative
        overflow = max(
            0, new_stress - character.stress_max
        )  # Calculate overflow beyond max
        character.stress = min(character.stress_max, new_stress)  # Cap stress at max
        if overflow > 0:
            # Convert overflow stress to HP damage (1 HP per overflow point)
            character.hp = max(0, character.hp - overflow)
            updated_fields.append(
                f"stress={delta.stress:+d} (now {character.stress}/{character.stress_max}, {overflow} overflow → -{overflow} HP, HP now {character.hp}/{character.hp_max})"
            )
        else:
            updated_fields.append(
                f"stress={delta.stress:+d} (now {character.stress}/{character.stress_max})"
            )
    if delta.add_conditions is not None:
        for condition in delta.add_conditions:
            if condition not in character.conditions:
                character.conditions.append(condition)
                updated_fields.append(f"added condition: {condition}")
    if delta.remove_conditions is not None:
        for condition in delta.remove_conditions:
            if condition in character.conditions:
                character.conditions.remove(condition)
                updated_fields.append(f"removed condition: {condition}")
    if delta.hope is not None and delta.hope != 0:
        if character.hope is None:
            raise ModelRetry(
                f"Cannot update hope for {character_name} - hope is only for PCs"
            )
        character.hope = max(
            0, min(6, character.hope + delta.hope)
        )  # Apply delta, clamp 0-6
        updated_fields.append(f"hope={delta.hope:+d} (now {character.hope})")
    if delta.armor_slots is not None and delta.armor_slots != 0:
        if character.armor_slots is None:
            raise ModelRetry(
                f"Cannot update armor_slots for {character_name} - armor slots are only for PCs"
            )
        # Apply delta (negative to use slots, positive to restore)
        # Clamp between 0 (all used) and armor_slots_max (all available)
        character.armor_slots = max(
            0,
            min(
                character.armor_slots_max or 0,
                character.armor_slots + delta.armor_slots,
            ),
        )  # Apply delta, clamp 0-max
        updated_fields.append(
            f"armor_slots={delta.armor_slots:+d} (now {character.armor_slots}/{character.armor_slots_max})"
        )

    if not updated_fields:
        return f"No changes to apply for {character_name} - all delta values are 0 or None, or conditions were already present/absent."

    logger.info(f"Updated {character_name}: {', '.join(updated_fields)}")
    return f"Successfully updated {character_name}: {', '.join(updated_fields)}"


@agent.tool
def create_countdown(
    ctx: RunContext[GameState],
    countdown_name: str,
    initial_value: int,
) -> str:
    """Create a new countdown tracker with an initial value.

    Args:
        countdown_name: Name/identifier for the countdown (e.g., 'Ritual Countdown', 'Reinforcements')
        initial_value: Starting value for the countdown (must be >= 0)
    """
    logger.info(
        f"{Colors.LIGHT_BLACK}Creating countdown '{countdown_name}' with value {initial_value}{Colors.RESET}"
    )

    if countdown_name in ctx.deps.countdowns:
        raise ModelRetry(
            f"Countdown '{countdown_name}' already exists. Use update_countdown() to modify it."
        )

    if initial_value < 0:
        raise ModelRetry(f"Countdown initial value must be >= 0, got {initial_value}")

    ctx.deps.countdowns[countdown_name] = initial_value
    logger.info(f"Created countdown '{countdown_name}' with value {initial_value}")
    if initial_value == 0:
        return f"Created countdown '{countdown_name}' with value 0 (REACHED 0 - effect triggers!)"
    return f"Created countdown '{countdown_name}' with value {initial_value}"


@agent.tool
def update_countdown(
    ctx: RunContext[GameState],
    countdown_name: str,
    delta: int,
) -> str:
    """Update an existing countdown tracker by applying a delta (change value).

    Countdowns track looming events (rituals completing, reinforcements arriving, etc.).
    When a countdown reaches 0, its effect occurs.

    Args:
        countdown_name: Name/identifier for the countdown (e.g., 'Ritual Countdown', 'Reinforcements')
        delta: Change to apply (e.g., -1 to tick down, +1 to tick up)
            - Applies the delta to the current value
            - Countdown cannot go below 0 (clamped to 0)
    """
    logger.info(
        f"{Colors.LIGHT_BLACK}Updating countdown '{countdown_name}': delta={delta}{Colors.RESET}"
    )

    if countdown_name not in ctx.deps.countdowns:
        raise ModelRetry(
            f"Countdown '{countdown_name}' does not exist. Use create_countdown() to create it first. Available countdowns: {list(ctx.deps.countdowns.keys())}"
        )

    old_value = ctx.deps.countdowns[countdown_name]
    new_value = max(0, old_value + delta)  # Apply delta, clamp to 0 minimum
    ctx.deps.countdowns[countdown_name] = new_value
    logger.info(f"Updated countdown '{countdown_name}': {old_value} → {new_value}")

    if new_value == 0:
        return f"Updated countdown '{countdown_name}': {old_value} → {new_value} (REACHED 0 - effect triggers!)"
    return f"Updated countdown '{countdown_name}': {old_value} → {new_value}"


@agent.instructions
def tool_call_examples() -> str:
    return """<sequencing>
Tool calls are sequential. Never end your turn on a dice roll. After rolling dice, stop and wait for the result, then narrate the outcome.

<example>
This example shows proper tool sequencing, the two-phase Experience flow, and spotlight management.

=== COMBAT ENCOUNTER START ===

[GM narrates and creates adversaries]
narrate("<describe ambush, introduce enemies>")
create_adversary("Goblin 1", CharacterState(hp_max=3, stress_max=1, minor_threshold=4, major_threshold=8, difficulty=10, attack_modifier=1))
create_adversary("Goblin 2", CharacterState(hp_max=3, stress_max=1, minor_threshold=4, major_threshold=8, difficulty=10, attack_modifier=1))

[GM has spotlight - Goblin 1 attacks]
narrate("<describe Goblin 1's attack>")
roll_dice(1, "d20")
→ Result: "🎲 [1d20] → 15"
declare("15 + 1 = 16 vs your Evasion 10 — hit!")
roll_dice(1, "d6")
→ Result: "🎲 [1d6] → 4"
declare("4 damage.")
player_take_damage(4)
→ Deferred: Player chooses whether to use armor slots
→ Player result: "Player took 4 damage (below Minor 7 = 1 HP). HP: 5/6"
declare("You mark 1 HP. (5/6 remaining)")
narrate("<narrate how the player takes the damage and pass spotlight to player>")
EndGameMasterTurn()

=== PLAYER TURN (TWO-PHASE EXPERIENCE FLOW) ===

User: I want to attack Goblin 1!

[Phase 1: Get player's approach and Experience proposal BEFORE rolling]
player_propose_action()
→ Deferred: Player describes approach and optionally proposes Experience
→ Player result: "Approach: I'll use my sword, aiming for its exposed flank
   Experience proposed: Not On My Watch (+2)
   Explanation: I'm protecting myself by taking out the threat before it can hurt me again
   (Hope will be spent if you approve the Experience)"

[GM evaluates: Does "Not On My Watch" apply to an offensive attack?]
[YES — protecting oneself by eliminating a threat fits the Experience's theme]
declare("Not On My Watch applies — you're eliminating a threat to protect yourself. Agility check.")

[Phase 2: Roll with approved Experience]
player_roll_dice(2, "d12", approved_experience="Not On My Watch")
→ Deferred: Player rolls (Hope spent automatically, +2 applied)
→ Player result: "🎲 [2d12 Duality Dice] → Hope:5 Fear:9 + Not On My Watch (+2) = 16; Fear is higher..."

declare("Hope 5 + Fear 9 + Agility (+2) + Experience (+2) = 18 vs Difficulty 10 — hit! Fear is higher, I gain 1 Fear. Now roll for damage.")
player_roll_dice(1, "d8")
→ Deferred: Player rolls damage
→ Player result: "🎲 [1d8] → 6"

declare("6 damage vs Minor 4 / Major 8 — marks 2 HP. Goblin 1: 1/3 HP remaining.")
update_character_state("Goblin 1", CharacterStateDelta(hp=-2))
narrate("<describe the wound>")

[Fear was higher, so GM takes spotlight]
narrate("<Goblin 1 retaliates>")
roll_dice(1, "d20")
→ Result: "🎲 [1d20] → 15"
declare("15 + 1 = 16 vs Evasion 10 — hit!")
roll_dice(1, "d6")
→ Result: "🎲 [1d6] → 4"
declare("4 damage.")
player_take_damage(4)
→ Deferred: Player chooses armor
→ Player result: "Player took 4 damage (below Minor 7 = 1 HP). HP: 4/6"
declare("You mark 1 HP. (4/6 remaining)")
narrate("<pass spotlight to player>")
EndGameMasterTurn()

=== EXPERIENCE REJECTED EXAMPLE ===

User: I try to break down the locked door!

[Phase 1: Get approach and Experience proposal]
player_propose_action()
→ Deferred: Player describes approach
→ Player result: "Approach: I'll shoulder-charge the door
   Experience proposed: Royal Mage (+2)
   Explanation: magic makes me stronger
   (Hope will be spent if you approve the Experience)"

[GM evaluates: Does "Royal Mage" apply to breaking down a door with brute force?]
[NO — Royal Mage is about arcane knowledge and courtly connections, not physical strength]
declare("Royal Mage doesn't apply here — it's about arcane knowledge, not physical strength.")
narrate("<explain, then proceed without Experience>")

[Phase 2: Roll WITHOUT approved Experience (Hope not spent)]
player_roll_dice(2, "d12")
→ Deferred: Player rolls (no Experience bonus)
→ Player result: "🎲 [2d12 Duality Dice] → Hope:7 Fear:5 = 12"

declare("Hope 7 + Fear 5 + Strength (+0) = 12 — success! Hope is higher, you gain 1 Hope.")
update_character_state("pc", CharacterStateDelta(hope=+1))
narrate("<describe door bursting open>")
EndGameMasterTurn()

=== PLAYER NEGOTIATES RULING ===

User: I try to calm the wild strixwolf.

[Phase 1: Get approach and Experience proposal]
player_propose_action()
→ Player result: "Approach: I extend my hand slowly, avoiding eye contact
   Experience proposed: Royal Mage (+2)
   Explanation: I've dealt with magical creatures at court
   (Hope will be spent if you approve the Experience)"

[GM evaluates: Royal Mage is arcane knowledge, not animal handling]
declare("Royal Mage doesn't quite apply — it's arcane knowledge, not animal instincts. This is a Presence roll.")
player_roll_dice(2, "d12")
→ Player sees ruling, chooses to negotiate
→ Player result: "NEGOTIATION: Royal Mage should apply because strixwolves are magical creatures, and I learned about their behavior studying at the royal menagerie."

[GM reconsiders: That's a good argument! Strixwolves ARE magical creatures]
declare("Good point — strixwolves are magical hybrids, and your courtly education included the royal menagerie. Royal Mage applies.")
player_roll_dice(2, "d12", approved_experience="Royal Mage")
→ Player accepts, rolls
→ Player result: "🎲 [2d12 Duality Dice] → Hope:8 Fear:4 + Royal Mage (+2) = 14"

declare("Hope 8 + Fear 4 + Presence (+1) + Royal Mage (+2) = 15. Success with Hope! You gain 1 Hope.")
update_character_state("pc", CharacterStateDelta(hope=+1))
narrate("<describe the strixwolf accepting you>")
EndGameMasterTurn()

=== SIMPLE ATTACK (NO EXPERIENCE) ===

User: I finish off Goblin 1!

[Simple attack - player doesn't need to propose Experience for every action]
narrate("<describe attack attempt>")
player_roll_dice(2, "d12")
→ Deferred: Player rolls
→ Player result: "🎲 [2d12 Duality Dice] → Hope:11 Fear:3 = 14"

declare("Hope 11 + Fear 3 + Agility (+2) = 16 vs Difficulty 10 — hit! Hope is higher, you gain 1 Hope.")
update_character_state("pc", CharacterStateDelta(hope=+1))
declare("Now roll for damage.")
narrate("<prompt for damage>")
player_roll_dice(1, "d8")
→ Deferred: Player rolls damage
→ Player result: "🎲 [1d8] → 5"

declare("5 damage defeats Goblin 1!")
update_character_state("Goblin 1", CharacterStateDelta(hp=-5))
remove_adversary("Goblin 1")
narrate("<describe defeat, pass spotlight>")
EndGameMasterTurn()
</example>

When your turn is complete, return an EndGameMasterTurn with any token changes.
</sequencing>"""


@agent.instructions
def add_daggerheart_rules() -> str:
    prompt_file = Path(__file__).parent / "prompts" / "ruleset_condensed.md"
    # prompt_file = Path(__file__).parent / "prompts" / "daggerheart_rules.md"
    content = prompt_file.read_text(encoding="utf-8").strip()
    return f"""<daggerheart_rules>
{content}
</daggerheart_rules>"""


@agent.instructions
def add_campaign_material() -> str:
    prompt_file = Path(__file__).parent / "prompts" / "one_shot_campaign.md"
    content = prompt_file.read_text(encoding="utf-8").strip()
    return f"""<campaign_material>
{content}
</campaign_material>"""


@agent.instructions
def add_player_character() -> str:
    prompt_file = Path(__file__).parent / "prompts" / "player_character.md"
    content = prompt_file.read_text(encoding="utf-8").strip()
    return f"""<player_character>
{content}
</player_character>"""


@agent.instructions
def current_game_state(ctx: RunContext[GameState]) -> str:
    logger.info(f"{Colors.LIGHT_BLACK}Game state: {ctx.deps.__dict__}{Colors.RESET}")
    return f"""<current_game_state>
{ctx.deps.__dict__}
</current_game_state>"""


def handle_player_propose_action(args: dict, game_state: GameState) -> str:
    """Handle the player_propose_action deferred tool - ask player for approach and Experience proposal."""
    pc = game_state.pc

    # Step 1: Ask player to describe their approach
    approach = input("📝 How do you want to approach this? ").strip()
    if not approach:
        approach = "(No specific approach described)"

    # Step 2: Ask about Experience usage (but don't spend Hope yet - just propose)
    experience_name = None
    experience_modifier = 0
    experience_explanation = None

    if pc.hope is not None and pc.hope > 0 and pc.experiences:
        # Show available Experiences first
        experiences_list = list(pc.experiences.items())
        logger.info(f"Your Experiences (Hope: {pc.hope}):")
        for i, (name, mod) in enumerate(experiences_list, 1):
            logger.info(f"  {i}. {name} (+{mod})")

        while True:
            use_experience = (
                input("Propose using an Experience? [y/N]: ").strip().lower()
            )

            if use_experience in ("y", "yes"):
                experiences_list = list(pc.experiences.items())

                # Prompt for selection
                while True:
                    choice = input("Select Experience (number) or 'cancel': ").strip()

                    if choice.lower() == "cancel":
                        break  # Go back to "use experience?" prompt

                    try:
                        idx = int(choice) - 1
                        if 0 <= idx < len(experiences_list):
                            experience_name, experience_modifier = experiences_list[idx]

                            # Prompt for explanation
                            while True:
                                explanation = input(
                                    f"How does '{experience_name}' apply here? "
                                ).strip()

                                if explanation:
                                    experience_explanation = explanation
                                    logger.info(
                                        f"   💭 Proposing: {experience_name} (+{experience_modifier})"
                                    )
                                    logger.info(f"   📖 Explanation: {explanation}")
                                    break
                                else:
                                    logger.error("Please provide an explanation.")

                            break
                        else:
                            logger.error(
                                f"Invalid selection. Please enter 1-{len(experiences_list)}."
                            )
                    except ValueError:
                        logger.error("Please enter a number or 'cancel'.")

                if experience_name:
                    break  # Exit "use experience?" loop
            elif use_experience in ("n", "no", ""):
                break
            else:
                logger.error("Please enter 'y' for yes or 'n' for no.")

    # Build result for GM to evaluate
    result_str = f"Approach: {approach}"
    if experience_name:
        result_str += (
            f"\nExperience proposed: {experience_name} (+{experience_modifier})"
        )
        result_str += f"\nExplanation: {experience_explanation}"
        result_str += "\n(Hope will be spent if you approve the Experience)"
    else:
        result_str += "\nNo Experience proposed."

    return result_str


def handle_player_roll_dice(args: dict, game_state: GameState) -> str:
    """Handle the player_roll_dice deferred tool - prompt player to roll or auto-roll."""
    dice_count = args["dice_count"]
    dice_type = args["dice_type"]
    approved_experience = args.get("approved_experience")

    if dice_count == 2 and dice_type == "d12":
        # Duality Dice
        pc = game_state.pc

        # Show GM's ruling and ask for confirmation before rolling
        logger.info("━━━ GM's Ruling ━━━")
        if approved_experience:
            logger.info(f"  ✓ Experience approved: {approved_experience}")
        else:
            logger.info("  ✗ No Experience approved")

        # Ask player to accept or negotiate
        while True:
            confirm = input("Accept ruling and roll? [Y/n]: ").strip().lower()
            if confirm in ("y", "yes", ""):
                break  # Proceed with roll
            elif confirm in ("n", "no"):
                # Player wants to negotiate
                negotiation = input("What would you like to negotiate? ").strip()
                if negotiation:
                    return f"NEGOTIATION: {negotiation}"
                else:
                    logger.info("No negotiation provided, proceeding with roll.")
                    break
            else:
                logger.error("Please enter 'y' to accept or 'n' to negotiate.")

        # Apply approved Experience if provided
        experience_name = None
        experience_modifier = 0

        if approved_experience and pc.experiences:
            if approved_experience in pc.experiences:
                experience_name = approved_experience
                experience_modifier = pc.experiences[approved_experience]
                # Spend Hope now that GM has approved
                if pc.hope is not None and pc.hope > 0:
                    pc.hope -= 1
                    logger.info(
                        f"✓ Using {experience_name} (+{experience_modifier}), Hope: {pc.hope}"
                    )
                else:
                    logger.warning(f"Cannot use {experience_name} - no Hope available!")
                    experience_name = None
                    experience_modifier = 0
            else:
                logger.warning(
                    f"Experience '{approved_experience}' not found in player's Experiences"
                )

        # Prompt for dice roll
        while True:
            prompt = "🎲 Roll your Duality Dice (2d12)"
            if experience_name:
                prompt += f" with {experience_name} (+{experience_modifier})"
            prompt += (
                " - Enter Hope and Fear (e.g., '5 9'), or press Enter to auto-roll: "
            )

            roll_input = input(prompt).strip()

            if not roll_input:
                # Auto-roll if user pressed Enter
                hope_die = random.randint(1, 12)
                fear_die = random.randint(1, 12)
                break
            else:
                try:
                    parts = [p for p in roll_input.split() if p.isdigit()]
                    if len(parts) >= 2:
                        hope_die = int(parts[0])
                        fear_die = int(parts[1])
                        if 1 <= hope_die <= 12 and 1 <= fear_die <= 12:
                            break
                        else:
                            logger.error("Values must be between 1 and 12.")
                            continue
                    else:
                        logger.error("Please enter two numbers (e.g., '5 9').")
                        continue
                except ValueError as e:
                    logger.error(f"Invalid input: {e}. Please enter two numbers.")
                    continue

        # Format result
        base_total = hope_die + fear_die
        total_with_mods = base_total + experience_modifier

        result_str = f"🎲 [2d12 Duality Dice] → Hope:{hope_die} Fear:{fear_die}"
        if experience_modifier > 0:
            result_str += f" + {experience_name} (+{experience_modifier})"
        result_str += f" = {total_with_mods}"

        logger.info(result_str)

        # Track Fear when Fear die is higher
        if fear_die > hope_die:
            game_state.fear_pool += 1
            logger.info(f"   😈 Fear pool: {game_state.fear_pool}")
            result_str += "; Fear is higher, so the GM gains 1 Fear and the spotlight will shift to the GM after the player's action."
    else:
        # Single die or multiple dice of same type
        while True:
            roll_input = input(
                f"🎲 Roll {dice_count}{dice_type} (or press Enter to auto-roll): "
            ).strip()

            if not roll_input:
                # Auto-roll if user pressed Enter
                sides = DICE_SIDES[dice_type]
                rolls = [random.randint(1, sides) for _ in range(dice_count)]
                if dice_count == 1:
                    result_str = f"🎲 [{dice_count}{dice_type}] → {rolls[0]}"
                else:
                    total = sum(rolls)
                    result_str = f"🎲 [{dice_count}{dice_type}] → {rolls} = {total}"
                logger.info(f"Auto-rolled: {result_str}")
                break
            else:
                try:
                    if dice_count == 1:
                        roll_value = int(roll_input)
                        sides = DICE_SIDES[dice_type]
                        if 1 <= roll_value <= sides:
                            result_str = f"🎲 [{dice_count}{dice_type}] → {roll_value}"
                            logger.info(result_str)
                            break
                        else:
                            logger.error(f"Value must be between 1 and {sides}.")
                    else:
                        # Multiple dice - parse as comma-separated or space-separated
                        # Filter out non-numeric words
                        parts = [
                            p.strip()
                            for p in roll_input.replace(",", " ").split()
                            if p.strip().isdigit()
                        ]
                        if len(parts) == dice_count:
                            sides = DICE_SIDES[dice_type]
                            rolls = [int(x) for x in parts]
                            if all(1 <= r <= sides for r in rolls):
                                total = sum(rolls)
                                result_str = (
                                    f"🎲 [{dice_count}{dice_type}] → {rolls} = {total}"
                                )
                                logger.info(result_str)
                                break
                            else:
                                logger.error(
                                    f"All values must be between 1 and {sides}."
                                )
                        else:
                            logger.error(
                                f"Expected {dice_count} numbers, got {len(parts)}."
                            )
                except ValueError as e:
                    logger.error(
                        f"Invalid input: {e}. Please enter {'a number' if dice_count == 1 else f'{dice_count} numbers'}."
                    )

    return result_str


def handle_player_take_damage(args: dict, game_state: GameState) -> str:
    """Handle the player_take_damage deferred tool - prompt player about armor slots.

    Only one armor slot can be used per damage instance. It reduces damage severity by one threshold level:
    - Severe (3 HP) → Major (2 HP)
    - Major (2 HP) → Minor (1 HP)
    - Minor (1 HP) → None (0 HP)
    """
    damage = args["damage"]
    pc = game_state.pc

    # Calculate HP to mark based on thresholds
    def calculate_hp_to_mark(dmg: int) -> int:
        if pc.severe_threshold is not None and dmg >= pc.severe_threshold:
            return 3
        elif dmg >= pc.major_threshold:
            return 2
        elif dmg >= pc.minor_threshold:
            return 2
        else:
            return 1

    # Calculate base HP to mark (before armor)
    base_hp_to_mark = calculate_hp_to_mark(damage)

    # Check if armor slots are available
    armor_available = (
        pc.armor_slots is not None
        and pc.armor_slots_max is not None
        and pc.armor_slots > 0
    )

    armor_used = 0
    hp_to_mark = base_hp_to_mark

    if armor_available and hp_to_mark > 0:
        # Show damage info and prompt for armor use
        threshold_info = f"Minor:{pc.minor_threshold}, Major:{pc.major_threshold}"
        if pc.severe_threshold:
            threshold_info += f", Severe:{pc.severe_threshold}"

        logger.info(f"⚔️  Incoming damage: {damage} (Thresholds: {threshold_info})")
        logger.info(f"   Base HP to mark: {base_hp_to_mark} HP")
        logger.info(f"   Armor slots available: {pc.armor_slots}/{pc.armor_slots_max}")

        # Prompt once for armor slot usage (only one armor slot can be used per damage instance)
        if hp_to_mark > 0:
            reduced_hp = max(0, hp_to_mark - 1)
            severity_name = {3: "Severe", 2: "Major", 1: "Minor"}.get(hp_to_mark, "")
            reduced_severity = {2: "Major", 1: "Minor", 0: "None"}.get(reduced_hp, "")

            # Keep prompting until we get a valid answer
            while True:
                armor_input = (
                    input(
                        f"   Use an armor slot to reduce severity? ({severity_name}: {hp_to_mark} HP → {reduced_severity}: {reduced_hp} HP) [y/N]: "
                    )
                    .strip()
                    .lower()
                )

                if armor_input in ("y", "yes"):
                    armor_used = 1
                    hp_to_mark = reduced_hp
                    logger.info(
                        f"   ✓ Using armor slot. HP to mark reduced to {hp_to_mark} HP"
                    )
                    break
                elif armor_input in ("n", "no", ""):
                    # Empty string defaults to "no" (as indicated by [y/N])
                    break
                else:
                    logger.error(
                        "Please enter 'y' for yes or 'n' for no (or press Enter for no)."
                    )
                    # Continue loop to re-prompt
    else:
        if not armor_available:
            logger.info(
                f"⚔️  Incoming damage: {damage} → {hp_to_mark} HP marked (no armor available)"
            )
        else:
            logger.info(f"⚔️  Incoming damage: {damage} → {hp_to_mark} HP marked")

    # Apply armor slot usage
    if armor_used > 0:
        pc.armor_slots -= armor_used
        logger.info(f"   🛡️  Armor slots: {pc.armor_slots}/{pc.armor_slots_max}")

    # Apply HP damage
    old_hp = pc.hp
    pc.hp = max(0, pc.hp - hp_to_mark)
    logger.info(f"   ❤️  HP: {old_hp} → {pc.hp}/{pc.hp_max}")

    # Build result string for the GM
    if armor_used > 0:
        severity_reduction = f"{base_hp_to_mark} → {hp_to_mark}"
        result_str = f"Player took {damage} damage. Used {armor_used} armor slot(s) to reduce HP marked from {severity_reduction}. HP: {pc.hp}/{pc.hp_max}, Armor: {pc.armor_slots}/{pc.armor_slots_max}"
    else:
        threshold_hit = (
            "below Minor"
            if damage < pc.minor_threshold
            else (
                "Severe"
                if pc.severe_threshold and damage >= pc.severe_threshold
                else ("Major" if damage >= pc.major_threshold else "Minor")
            )
        )
        result_str = f"Player took {damage} damage ({threshold_hit} threshold = {hp_to_mark} HP). HP: {pc.hp}/{pc.hp_max}"

    return result_str


async def run_chat():
    """Async chat loop (non-streaming)."""
    logger.info("🤖 AI Chat Game Master")
    logger.info("=" * 50)
    logger.info("Type 'exit' or 'quit' to end the conversation")
    logger.info("=" * 50)
    logger.info("")

    # Initialize session cost tracking
    session_total_cost = 0.0

    # Initialize game state
    game_state = GameState()

    # Prime the conversation history with the opening scene
    gm_opening = """This evening, you finally made it to the Sablewood—a sprawling forest filled with colossal trees some say are even older than the Forgotten Gods.
Sablewood is renowned for two things: its sunken trade routes, traveled by countless merchants, and its unique, hybrid animals.
Even now, from within your carriage, strange sounds drift in: the low calls of lark-moths, the croak of lemur-toads, the scittering of a family of fox-bats in the underbrush.

As your steeds pull the carriage around a tight corner—one wheel briefly leaving the ground—you spot an overturned merchant's cart, lying sideways in the path and blocking your way forward. A scattering of fruits and vegetables litter the trail.

From around the side of the cart steps a strixwolf: a large creature with a wolf's body, an owl's face, and broad wings arching from its back. It finishes chewing its meal—the hand of a dead merchant—and fixes you with a curious gaze, clearly trying to judge whether you're friend or foe. Clumsily, two small pups follow, watching their mother and you with caution.

You pull back on the reins, bringing your carriage to a halt.

What do you do?
"""

    # Display the opening scene
    logger.info("🤖 Game Master:")
    logger.info(f"{Colors.GREEN}{gm_opening}{Colors.RESET}")
    logger.info("")

    # Create the message history directly without invoking the agent
    from pydantic_ai.messages import (
        ModelRequest,
        UserPromptPart,
        ModelResponse,
        TextPart,
    )

    # Initialize message history with: user "START" message + GM opening response
    message_history = [
        ModelRequest(
            parts=[
                UserPromptPart(
                    content="Start the campaign. My character is Marlowe Fairwind."
                )
            ]
        ),
        ModelResponse(parts=[TextPart(content=gm_opening)]),
    ]

    # for user_input in ["I approach.", "I speak calmly to the strixwolf."]:
    while True:
        # while True:
        # Get user input
        user_input = input("You: ").strip()

        # Check for exit commands
        if user_input.lower() in ("exit", "quit", "q"):
            logger.info("\n👋 Goodbye!")
            if session_total_cost > 0:
                logger.info(f"\n💰 Session total cost: ${session_total_cost:.6f}")
            break

        # Run the agent - tools (narrate, roll_dice) handle their own output
        logger.info("\n🤖 Game Master:")
        result_for_cost = None
        try:
            current_input = user_input
            deferred_results = None

            while True:
                result = await agent.run(
                    current_input,
                    deps=game_state,
                    message_history=message_history,
                    deferred_tool_results=deferred_results,
                    model_settings={"extra_body": {"tool_choice": "required"}},
                )

                # Check if we have deferred tool requests (player interaction needed)
                if isinstance(result.output, DeferredToolRequests):
                    # Update message history with the deferred tool call
                    message_history = result.all_messages()
                    deferred_results = DeferredToolResults()

                    for call in result.output.calls:
                        args = call.args_as_dict()

                        if call.tool_name == "player_propose_action":
                            # Handle player proposing their approach + Experience
                            result_str = handle_player_propose_action(args, game_state)
                        elif call.tool_name == "player_roll_dice":
                            # Handle player dice roll
                            result_str = handle_player_roll_dice(args, game_state)
                        elif call.tool_name == "player_take_damage":
                            # Handle player taking damage (armor slot choice)
                            result_str = handle_player_take_damage(args, game_state)
                        else:
                            logger.error(f"Unknown deferred tool: {call.tool_name}")
                            result_str = (
                                f"Error: Unknown deferred tool {call.tool_name}"
                            )

                        deferred_results.calls[call.tool_call_id] = result_str

                    # Continue the run with the player's results (no new user input needed)
                    current_input = ""
                    continue
                # Normal completion - show token changes from the GM's turn
                elif isinstance(result.output, EndGameMasterTurn):
                    turn_result: EndGameMasterTurn = result.output
                    if turn_result.notes:
                        logger.info(f"💡 GM notes: {turn_result.notes}")
                elif isinstance(result.output, str):
                    logger.info(f"💡 GM: {result.output}")
                else:
                    # This shouldn't happen, but handle it gracefully
                    logger.warning(f"Unexpected output type: {type(result.output)}")

                # Update message history with all messages from this interaction
                message_history = result.all_messages()
                logger.info(
                    f"{Colors.LIGHT_BLACK}Game state: {game_state.__dict__}{Colors.RESET}"
                )

                # Store result for cost calculation
                # result_for_cost = result
                break

        except Exception as e:
            logger.error(f"❌ Error: {e}")

        logger.info("")  # Add blank line for readability

        # # Calculate and log cost for this run (logging handled by calculate_run_cost)
        # run_cost, *_ = calculate_run_cost(
        #     result_for_cost, model_name, provider_id="openrouter"
        # )

        # # Track session total
        # if run_cost is not None and run_cost > 0:
        #     session_total_cost += run_cost
        #     logger.info(f"Session total cost: ${session_total_cost:.6f}")


# async def run_chat_stream():
#     """Async chat loop with streaming responses."""
#     click.echo("🤖 AI Chat Game Master")
#     click.echo("=" * 50)
#     click.echo("Type 'exit' or 'quit' to end the conversation")
#     click.echo("=" * 50)
#     click.echo()

#     # Initialize session cost tracking
#     session_total_cost = 0.0

#     # Prime the conversation history with the opening scene
#     gm_opening = """This evening, you finally made it to the Sablewood—a sprawling forest filled with colossal trees some say are even older than the Forgotten Gods.
# Sablewood is renowned for two things: its sunken trade routes, traveled by countless merchants, and its unique, hybrid animals.
# Even now, from within your carriage, strange sounds drift in: the low calls of lark-moths, the croak of lemur-toads, the scittering of a family of fox-bats in the underbrush.

# As your steeds pull the carriage around a tight corner—one wheel briefly leaving the ground—you spot an overturned merchant's cart, lying sideways in the path and blocking your way forward. A scattering of fruits and vegetables litter the trail.

# From around the side of the cart steps a strixwolf: a large creature with a wolf's body, an owl's face, and broad wings arching from its back. It finishes chewing its meal—the hand of a dead merchant—and fixes you with a curious gaze, clearly trying to judge whether you're friend or foe. Clumsily, two small pups follow, watching their mother and you with caution.

# You pull back on the reins, bringing your carriage to a halt.

# What do you do?
# """

#     # Display the opening scene
#     click.echo("🤖 Game Master:")
#     click.echo(gm_opening)
#     click.echo()

#     # Create the message history directly without invoking the agent
#     from pydantic_ai.messages import (
#         ModelRequest,
#         UserPromptPart,
#         ModelResponse,
#         TextPart,
#     )

#     # Initialize message history with: user "START" message + GM opening response
#     message_history = [
#         ModelRequest(
#             parts=[
#                 UserPromptPart(
#                     content="Start the campaign. My character is Marlowe Fairwind."
#                 )
#             ]
#         ),
#         ModelResponse(parts=[TextPart(content=gm_opening)]),
#     ]

#     # for user_input in ["I approach.", "I speak calmly to the strixwolf."]:
#     while True:
#         # while True:
#         # Get user input
#         user_input = input("You: ").strip()

#         # Check for exit commands
#         if user_input.lower() in ("exit", "quit", "q"):
#             click.echo("\n👋 Goodbye!")
#             if session_total_cost > 0:
#                 click.echo(f"\n💰 Session total cost: ${session_total_cost:.6f}")
#             break

#         # Run the agent with streaming, showing dice rolls as they happen
#         click.echo("\n🤖 Game Master:")
#         result_for_cost = None
#         try:
#             async with agent.iter(
#                 user_input,
#                 message_history=message_history,
#             ) as run:
#                 async for node in run:
#                     if Agent.is_model_request_node(node):
#                         # Stream text and tool calls from the model
#                         async with node.stream(run.ctx) as request_stream:
#                             async for event in request_stream:
#                                 if isinstance(event, PartDeltaEvent):
#                                     # Stream text deltas
#                                     if hasattr(event.delta, "content_delta"):
#                                         print(
#                                             event.delta.content_delta,
#                                             end="",
#                                             flush=True,
#                                         )
#                                 elif isinstance(event, FunctionToolCallEvent):
#                                     # Show dice roll being made
#                                     args = event.part.args
#                                     if event.part.tool_name == "roll_dice":
#                                         dice_count = args.get("dice_count", 1)
#                                         dice_type = args.get("dice_type", "d20")
#                                         print(
#                                             f"\n🎲 Rolling {dice_count}{dice_type}...",
#                                             end="",
#                                             flush=True,
#                                         )

#                     elif Agent.is_call_tools_node(node):
#                         # Handle tool execution and show results
#                         async with node.stream(run.ctx) as handle_stream:
#                             async for event in handle_stream:
#                                 if isinstance(event, FunctionToolResultEvent):
#                                     # Show dice roll result
#                                     result_content = event.result.content
#                                     if hasattr(result_content, "rolls"):
#                                         rolls = result_content.rolls
#                                         dice_type = result_content.dice_type
#                                         if len(rolls) == 1:
#                                             print(f" {rolls[0]}!", flush=True)
#                                         elif len(rolls) == 2 and dice_type == "d12":
#                                             # Special formatting for Hope/Fear dice
#                                             hope, fear = rolls
#                                             higher = "Hope" if hope >= fear else "Fear"
#                                             print(
#                                                 f" Hope:{hope} Fear:{fear} → {higher}!",
#                                                 flush=True,
#                                             )
#                                         else:
#                                             print(
#                                                 f" {rolls} = {result_content.total}!",
#                                                 flush=True,
#                                             )

#                 print()  # Newline after streaming completes

#                 # Update message history with all messages from this interaction
#                 message_history = run.result.all_messages()

#                 # Store result for cost calculation after streaming
#                 result_for_cost = run.result
#         except Exception as e:
#             click.echo(f"❌ Error: {e}", err=True)

#         click.echo()  # Add blank line for readability

#         # Calculate and log cost for this run (logging handled by calculate_run_cost)
#         run_cost, *_ = calculate_run_cost(
#             result_for_cost, model_name, provider_id="openrouter"
#         )

#         # Track session total
#         if run_cost is not None and run_cost > 0:
#             session_total_cost += run_cost
#             logger.info(f"Session total cost: ${session_total_cost:.6f}")


@click.command()
def main():
    asyncio.run(run_chat())


if __name__ == "__main__":
    main()
