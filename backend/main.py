"""Basic Pydantic AI agent implementation for LLM GM testing."""

import asyncio
import os
import random
import sys
from pathlib import Path
from typing import Literal

import click
import dotenv
import logfire
from loguru import logger
from pydantic import BaseModel, Field, model_validator
from pydantic_ai import Agent, ModelRetry, RunContext
from pydantic_ai.models.openai import OpenAIChatModel
from pydantic_ai.models.openrouter import OpenRouterModel
from pydantic_ai.providers.deepseek import DeepSeekProvider
from utils.cost import calculate_run_cost

dotenv.load_dotenv()


# ANSI color codes for terminal output
class Colors:
    """ANSI color codes for terminal output."""

    GREEN = "\033[32m"
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
        default=None, ge=0, description="Current armor slots marked (PCs only)"
    )
    armor_slots_max: int | None = Field(
        default=None, ge=0, description="Total armor slots (PCs only)"
    )
    evasion: int | None = Field(
        default=None, ge=0, description="Evasion value (PCs only, for being attacked)"
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

    internal_notes: str | None = None  # GM's private notes for continuity


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
            armor_slots=0,
            armor_slots_max=3,  # Leather Armor has 3 armor slots
            evasion=10,  # Marlowe's Evasion is 10
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
# model = OpenRouterModel(model_name)

# Use DeepSeek API directly (set DEEPSEEK_API_KEY environment variable)
model_name = "deepseek-chat"
model = OpenAIChatModel(model_name, provider=DeepSeekProvider())

# Create an agent with the OpenRouter model
agent = Agent(
    model,
    deps_type=GameState,
    output_type=EndGameMasterTurn,
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
- **Ask questions and incorporate answers**: Invite the player to co-create details
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

<output_format>
You communicate exclusively through tool calls. The player only sees output from narrate(); any text outside of tool calls is invisible to them.

Tools:
- narrate(text): All player-facing communication—descriptions, dialogue, outcomes, rules explanations
- roll_dice(count, type): All dice rolls. Fear/Hope pools update automatically for Duality Dice.
  - Special case for Duality Dice: Always roll them together as a pair, i.e. roll_dice(2, "d12"), rather than rolling each die separately.
- spend_fear(amount): Spend Fear tokens to take spotlight actions or activate GM abilities.
- create_adversary(id, state): Create an adversary with stats (HP, thresholds, difficulty, etc.)
- remove_adversary(id): Remove a defeated adversary from the game state
- update_character_state(target, delta): Update PC or adversary state (HP, Stress, conditions, Hope, armor slots)
- create_countdown(name, initial_value): Create a new countdown tracker with an initial value
- update_countdown(name, delta): Update an existing countdown tracker by applying a delta (change value)
  - delta: Change to apply (e.g., -1 to tick down, +1 to tick up)
  - Only works on existing countdowns (use create_countdown first)
  - When a countdown reaches 0, its effect triggers (ritual completes, reinforcements arrive, etc.)
</output_format>

<sequencing>
Tool calls are sequential. Never end your turn on a dice roll. After rolling dice, stop and wait for the result, then narrate the outcome.

<example>
narrate("Two goblins leap from the bushes, daggers drawn! The first goblin attacks!")

# First, create the adversaries
create_adversary("Goblin 1", CharacterState(hp_max=3, stress_max=1, minor_threshold=4, major_threshold=8, difficulty=10, attack_modifier=1))
create_adversary("Goblin 2", CharacterState(hp_max=3, stress_max=1, minor_threshold=4, major_threshold=8, difficulty=10, attack_modifier=1))
roll_dice(1, "d20")
> result: 15
narrate("A 15 + 1 = 16 vs your Evasion of 10 -- it hits! Roll damage.")
roll_dice(1, "d6")
> result: 4
narrate("4 damage. Compare to your thresholds: Minor 7, Major 14. Since 4 < 7, you mark 1 HP.")
update_character_state("pc", CharacterStateDelta(hp=-1))
narrate("You now have 5/6 HP remaining. The spotlight shifts to you. What do you do?")

User: I attack Goblin 1!

narrate("You lunge forward, blade flashing!")
roll_dice(2, "d12")
> result: Hope 5, Fear 9
narrate("Hope 5, Fear 9 -- total is 5 + 9 + Agility (+2) = 16. That hits Goblin 1's Difficulty of 10! But Fear is higher, so the GM gains 1 Fear and the spotlight shifts to the GM after your action. Roll damage.")
roll_dice(1, "d8")
> result: 6
narrate("You deal 6 damage! Goblin 1's thresholds are Minor 4, Major 8. Since 6 >= 4 but < 8, it marks 2 HP.")
update_character_state("Goblin 1", CharacterStateDelta(hp=-2))
narrate("Goblin 1 now has 1/3 HP remaining. The goblin staggers, wounded but alive. The spotlight shifts to the GM. Goblin 1 seizes the moment and strikes!")
roll_dice(1, "d20")
> result: 15
narrate("A 15 + 1 = 16 vs your Evasion of 10 -- it hits! Roll damage.")
roll_dice(1, "d6")
> result: 4
narrate("4 damage. You mark another 1 HP.")
update_character_state("pc", CharacterStateDelta(hp=-1))
narrate("I will spend a Fear token to spotlight Goblin 2 who will attack you with its spear.")
spend_fear(1)
roll_dice(1, "d20")
> result: 10
narrate("A 10 + 1 = 11 vs your Evasion of 10 -- it hits! Roll damage.")
roll_dice(1, "d6")
> result: 3
narrate("3 damage. Since 3 < 7, you mark 1 HP.")
update_character_state("pc", CharacterStateDelta(hp=-1))
narrate("The spotlight shifts back to you. What do you do?")

User: I finish off Goblin 1!

narrate("You strike Goblin 1 with a finishing blow!")
roll_dice(2, "d12")
> result: Hope 11, Fear 3
narrate("Hope 11, Fear 3 -- total is 11 + 3 + Agility (+2) = 16. That hits! Hope is higher, so you gain 1 Hope. Roll damage.")
roll_dice(1, "d8")
> result: 5
narrate("You deal 5 damage! Goblin 1 is defeated!")
update_character_state("Goblin 1", CharacterStateDelta(hp=-5))  # Reduce HP to 0 or below
update_character_state("pc", CharacterStateDelta(hope=+1))  # Gain 1 Hope (Hope was higher)
remove_adversary("Goblin 1")
narrate("Goblin 1 collapses to the ground. Only Goblin 2 remains. What do you do?")
EndGameMasterTurn()
</example>

When your turn is complete, return an EndGameMasterTurn with any token changes.
</sequencing>
""",
)


@agent.tool
def roll_dice(ctx: RunContext[GameState], dice_count: int, dice_type: DiceType) -> str:
    """Roll dice. Stop after calling this and wait for the result before narrating the outcome.

    Args:
        dice_count: Number of dice to roll
        dice_type: Type of die (d4, d6, d8, d10, d12, d20, d100)
    """
    sides = DICE_SIDES[dice_type]
    rolls = [random.randint(1, sides) for _ in range(dice_count)]

    # Display the roll
    if len(rolls) == 1:
        result_str = f"🎲 [{dice_count}{dice_type}] → {rolls[0]}"
        logger.info(result_str)
    elif len(rolls) == 2 and dice_type == "d12":
        # Special formatting for Hope/Fear dice (Duality Dice)
        hope, fear = rolls
        result_str = f"🎲 [2d12 Duality Dice] → Hope:{hope} Fear:{fear}"
        logger.info(result_str)
        # Track Fear when Fear die is higher
        if fear > hope:
            ctx.deps.fear_pool += 1
            logger.info(f"   😈 Fear pool: {ctx.deps.fear_pool}")
            result_str += "; Fear is higher, so the GM gains 1 Fear and the spotlight will shift to the GM after the player's action."
    else:
        result_str = f"🎲 [{dice_count}{dice_type}] → {rolls} = {sum(rolls)}"
        logger.info(result_str)

    return result_str


@agent.tool_plain
def narrate(narration: str) -> None:
    """Send text to the player. This is the only way the player sees your output.

    Args:
        narration: Scene descriptions, dialogue, outcomes, or rules explanations.
    """
    logger.info(f"{Colors.GREEN}{narration}{Colors.RESET}")


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
        description="Change to armor slots (e.g., -1 to mark an armor slot, +1 to unmark, PCs only)",
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
        delta: CharacterStateDelta with relative changes to apply (e.g., hp=-2 to reduce HP by 2, hp=+3 to increase HP by 3)
    """
    logger.info(
        f"{Colors.LIGHT_BLACK}Updating character state for {target}: {delta.__dict__}{Colors.RESET}"
    )
    if target == "pc":
        character = ctx.deps.pc
        character_name = "PC"
    elif target in ctx.deps.adversaries:
        character = ctx.deps.adversaries[target]
        character_name = f"adversary '{target}'"
    else:
        logger.warning(f"Target '{target}' not found")
        raise ModelRetry(
            f"Target '{target}' does not exist. Use 'pc' for player character, or one of: {list(ctx.deps.adversaries.keys())}"
        )

    updated_fields = []
    if delta.hp is not None:
        character.hp = max(
            0, character.hp + delta.hp
        )  # Apply delta, ensure non-negative
        updated_fields.append(
            f"hp={delta.hp:+d} (now {character.hp}/{character.hp_max})"
        )
    if delta.stress is not None:
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
    if delta.hope is not None:
        if character.hope is None:
            raise ModelRetry(
                f"Cannot update hope for {character_name} - hope is only for PCs"
            )
        character.hope = max(
            0, min(6, character.hope + delta.hope)
        )  # Apply delta, clamp 0-6
        updated_fields.append(f"hope={delta.hope:+d} (now {character.hope})")
    if delta.armor_slots is not None:
        if character.armor_slots is None:
            raise ModelRetry(
                f"Cannot update armor_slots for {character_name} - armor slots are only for PCs"
            )
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
        raise ModelRetry(
            "No fields provided to update. Provide at least one field in delta."
        )

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
            result = await agent.run(
                user_input,
                deps=game_state,
                message_history=message_history,
                model_settings={"extra_body": {"tool_choice": "required"}},
            )

            # Show token changes from the GM's turn
            turn_result: EndGameMasterTurn = result.output
            if turn_result.internal_notes:
                logger.info(f"💡 GM notes: {turn_result.internal_notes}")

            # Update message history with all messages from this interaction
            message_history = result.all_messages()
            logger.info(
                f"{Colors.LIGHT_BLACK}Game state: {game_state.__dict__}{Colors.RESET}"
            )

            # Store result for cost calculation
            # result_for_cost = result
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
