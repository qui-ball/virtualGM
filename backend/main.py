"""Virtual GM agent implementation for the custom simplified ruleset."""

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
from pydantic import BaseModel, Field
from pydantic_ai import Agent, ModelRetry, RunContext

dotenv.load_dotenv()


# ANSI color codes for terminal output
class Colors:
    GREEN = "\033[32m"
    YELLOW = "\033[33m"
    RED = "\033[31m"
    LIGHT_BLACK = "\033[90m"
    RESET = "\033[0m"


# Configure loguru
loguru_level = os.getenv("LOGURU_LEVEL", "INFO").upper()
logger.remove()
logger.add(
    sys.stderr,
    level=loguru_level,
    colorize=True,
    format="<green>{time:HH:mm:ss}</green> | <level>{level: <8}</level> | <cyan>{name}</cyan>:<cyan>{function}</cyan> - <level>{message}</level>",
)

# Configure Logfire
logfire_token = os.getenv("LOGFIRE_TOKEN")
logfire_environment = os.getenv("LOGFIRE_ENVIRONMENT", "development")

if logfire_token:
    logfire.configure(token=logfire_token, environment=logfire_environment)
else:
    logfire.configure(send_to_logfire=False)

logfire.instrument_pydantic_ai()


# =============================================================================
# Dice System
# =============================================================================

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


# =============================================================================
# State Models
# =============================================================================

StatName = Literal["might", "finesse", "wit", "presence"]
ClassName = Literal["warrior", "mage", "ranger", "bard"]
ConditionName = Literal["poisoned", "stunned", "frightened", "restrained", "prone"]

# Hit dice by class
CLASS_HIT_DICE: dict[ClassName, DiceType] = {
    "warrior": "d10",
    "mage": "d6",
    "ranger": "d8",
    "bard": "d8",
}


class Stats(BaseModel):
    """Character stats with modifiers."""

    might: int = Field(default=0, ge=-5, le=5, description="Physical power, endurance")
    finesse: int = Field(
        default=0, ge=-5, le=5, description="Coordination, dexterity, stealth"
    )
    wit: int = Field(
        default=0, ge=-5, le=5, description="Perception, smarts, investigation"
    )
    presence: int = Field(
        default=0, ge=-5, le=5, description="Charisma, charm, personality"
    )


class CharacterState(BaseModel):
    """Player character state."""

    name: str = Field(description="Character name")
    character_class: ClassName = Field(description="Character class")
    level: int = Field(default=1, ge=1, le=10, description="Character level")
    xp: int = Field(default=0, ge=0, description="Total experience points")

    # Core stats
    stats: Stats = Field(default_factory=Stats)

    # Combat stats
    hp: int = Field(description="Current hit points")
    hp_max: int = Field(description="Maximum hit points")
    evasion: int = Field(description="Evasion (target number to be hit)")

    # Magic (for Mage/Bard)
    mana: int | None = Field(default=None, description="Current mana (casters only)")
    mana_max: int | None = Field(
        default=None, description="Maximum mana (casters only)"
    )

    # Conditions
    conditions: list[ConditionName] = Field(
        default_factory=list, description="Active conditions"
    )

    # Progression
    class_abilities: list[str] = Field(
        default_factory=list, description="Chosen class ability IDs"
    )
    spells_known: list[str] = Field(
        default_factory=list, description="Known spell names (casters only)"
    )

    # Equipment & economy
    gold: int = Field(default=10, ge=0, description="Gold pieces")
    inventory: list[str] = Field(default_factory=list, description="Items carried")
    equipped_weapon: str | None = Field(
        default=None, description="Currently equipped weapon"
    )
    equipped_armor: str | None = Field(
        default=None, description="Currently equipped armor"
    )


class EnemyState(BaseModel):
    """Enemy/adversary state."""

    name: str = Field(description="Enemy name/identifier")
    hp: int = Field(description="Current hit points")
    hp_max: int = Field(description="Maximum hit points")
    evasion: int = Field(description="Evasion (target number to hit)")
    attack_modifier: int = Field(default=0, description="Modifier to attack rolls")
    damage: str = Field(default="1d6", description="Damage expression (e.g., '1d6+2')")
    conditions: list[ConditionName] = Field(
        default_factory=list, description="Active conditions"
    )


class GameState:
    """Mutable game state shared across tool calls."""

    def __init__(self):
        # Player character (single player)
        self.pc: CharacterState | None = None

        # Enemies in current encounter
        self.enemies: dict[str, EnemyState] = {}

        # Campaign tracking
        self.time_counter: int | None = None  # Chapter time counter
        self.countdowns: dict[str, int] = {}  # Named countdowns

        # Combat state
        self.in_combat: bool = False
        self.is_boss_battle: bool = False
        self.initiative_order: list[str] = []  # Names in initiative order
        self.current_turn_index: int = 0


class EndGameMasterTurn(BaseModel):
    """Signals the end of the GM's turn."""

    internal_notes: str | None = None


# =============================================================================
# Agent Setup
# =============================================================================

agent = Agent(
    "openrouter:deepseek/deepseek-v3.2",
    deps_type=GameState,
    output_type=EndGameMasterTurn,
    instructions="""You are a game master (GM) for a custom tabletop RPG, running a solo campaign.

## Core Responsibilities
- Narrate vivid, immersive scenes
- Voice NPCs with distinct personalities
- Adjudicate rules fairly using the provided ruleset
- Track combat and manage enemies

## GM Style
- Be descriptive but concise—paint scenes in 2-3 sentences
- Use sensory details to immerse the player
- Never narrate the player character's thoughts, feelings, or actions
- Ask the player what they want to do

## Combat Rules Summary
- Attack roll: d20 + stat modifier + ability bonuses vs target's Evasion
- Damage: weapon/spell dice + stat modifier
- Critical hit (natural 20): roll damage normally + add max damage dice, then add modifier once
- Advantage/Disadvantage: roll 2d20, take higher/lower

## Output Format
Communicate through tool calls. The player only sees output from narrate().

Tools:
- narrate(text): All player-facing communication
- roll_dice(count, dice_type): Roll dice for GM/enemy actions
- create_enemy(enemy_id, state): Create an enemy with stats
- remove_enemy(enemy_id): Remove a defeated enemy
- update_character_state(target, field, value): Update PC or enemy state
- apply_damage(target, amount): Apply damage to PC or enemy
- apply_condition(target, condition): Apply a condition
- remove_condition(target, condition): Remove a condition
- create_countdown(name, value): Create a countdown tracker
- update_countdown(name, delta): Update a countdown

When your turn is complete, return EndGameMasterTurn.
""",
)


# =============================================================================
# Dynamic Instructions
# =============================================================================


@agent.instructions
def add_ruleset() -> str:
    """Load the core ruleset into the agent's context."""
    ruleset_path = Path(__file__).parent.parent / "rulesets" / "core-ruleset.md"
    content = ruleset_path.read_text(encoding="utf-8").strip()
    return f"<ruleset>\n{content}\n</ruleset>"


@agent.instructions
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


# =============================================================================
# Tools
# =============================================================================


@agent.tool_plain
def narrate(text: str) -> None:
    """Send text to the player. This is the only way the player sees your output.

    Args:
        text: Scene descriptions, dialogue, outcomes, or rules explanations.
    """
    logger.info(f"{Colors.GREEN}{text}{Colors.RESET}")


@agent.tool_plain
def roll_dice(
    dice_count: int,
    dice_type: DiceType,
    advantage: bool = False,
    disadvantage: bool = False,
) -> str:
    """Roll dice for GM/enemy actions.

    Args:
        dice_count: Number of dice to roll
        dice_type: Type of die (d4, d6, d8, d10, d12, d20, d100)
        advantage: If True and rolling d20, roll 2d20 and take higher
        disadvantage: If True and rolling d20, roll 2d20 and take lower
    """
    sides = DICE_SIDES[dice_type]

    # Handle advantage/disadvantage for d20 rolls
    if dice_type == "d20" and dice_count == 1 and (advantage or disadvantage):
        roll1 = random.randint(1, 20)
        roll2 = random.randint(1, 20)

        if advantage and disadvantage:
            # Cancel out - normal roll
            result = roll1
            result_str = f"🎲 [d20] → {result} (adv/disadv cancel)"
        elif advantage:
            result = max(roll1, roll2)
            result_str = f"🎲 [d20 advantage] → {roll1}, {roll2} → {result}"
        else:  # disadvantage
            result = min(roll1, roll2)
            result_str = f"🎲 [d20 disadvantage] → {roll1}, {roll2} → {result}"

        # Check for natural 20
        if result == 20:
            result_str += " (NATURAL 20 - CRITICAL HIT!)"

        logger.info(result_str)
        return result_str

    # Standard roll
    rolls = [random.randint(1, sides) for _ in range(dice_count)]
    total = sum(rolls)

    if dice_count == 1:
        result_str = f"🎲 [{dice_count}{dice_type}] → {total}"
        # Check for natural 20 on attack rolls
        if dice_type == "d20" and total == 20:
            result_str += " (NATURAL 20 - CRITICAL HIT!)"
    else:
        result_str = f"🎲 [{dice_count}{dice_type}] → {rolls} = {total}"

    logger.info(result_str)
    return result_str


@agent.tool
def create_enemy(
    ctx: RunContext[GameState],
    enemy_id: str,
    hp_max: int,
    evasion: int,
    attack_modifier: int = 0,
    damage: str = "1d6",
) -> str:
    """Create an enemy in the encounter.

    Args:
        enemy_id: Unique identifier for the enemy (e.g., "Goblin 1")
        hp_max: Maximum hit points
        evasion: Evasion value (target number to hit)
        attack_modifier: Bonus to attack rolls
        damage: Damage expression (e.g., "1d6+2")
    """
    if enemy_id in ctx.deps.enemies:
        raise ModelRetry(
            f"Enemy '{enemy_id}' already exists. Use a different ID or remove it first."
        )

    enemy = EnemyState(
        name=enemy_id,
        hp=hp_max,
        hp_max=hp_max,
        evasion=evasion,
        attack_modifier=attack_modifier,
        damage=damage,
    )
    ctx.deps.enemies[enemy_id] = enemy

    logger.info(
        f"Created enemy '{enemy_id}' (HP: {hp_max}, Evasion: {evasion}, Attack: +{attack_modifier}, Damage: {damage})"
    )
    return f"Created '{enemy_id}' with {hp_max} HP, Evasion {evasion}"


@agent.tool
def remove_enemy(ctx: RunContext[GameState], enemy_id: str) -> str:
    """Remove an enemy from the encounter (typically when defeated).

    Args:
        enemy_id: The enemy identifier to remove
    """
    if enemy_id not in ctx.deps.enemies:
        raise ModelRetry(
            f"Enemy '{enemy_id}' not found. Available: {list(ctx.deps.enemies.keys())}"
        )

    del ctx.deps.enemies[enemy_id]
    logger.info(f"Removed enemy '{enemy_id}'")
    return f"Removed '{enemy_id}'"


@agent.tool
def apply_damage(ctx: RunContext[GameState], target: str, amount: int) -> str:
    """Apply damage to the player character or an enemy.

    Args:
        target: "pc" for player character, or enemy_id for an enemy
        amount: Damage amount to apply
    """
    if amount < 0:
        raise ModelRetry("Damage amount must be non-negative. Use healing instead.")

    if target == "pc":
        if ctx.deps.pc is None:
            raise ModelRetry("No player character initialized.")
        old_hp = ctx.deps.pc.hp
        ctx.deps.pc.hp = max(0, ctx.deps.pc.hp - amount)
        new_hp = ctx.deps.pc.hp

        result = f"PC took {amount} damage: {old_hp} → {new_hp}/{ctx.deps.pc.hp_max} HP"

        if new_hp == 0:
            if ctx.deps.is_boss_battle:
                result += " (DEFEATED in boss battle - player must choose: Blaze of Glory or Risk It All)"
            else:
                result += " (DEFEATED - recovers with full HP/mana, but loot is stolen)"

        logger.info(f"💔 {result}")
        return result

    elif target in ctx.deps.enemies:
        enemy = ctx.deps.enemies[target]
        old_hp = enemy.hp
        enemy.hp = max(0, enemy.hp - amount)
        new_hp = enemy.hp

        result = (
            f"'{target}' took {amount} damage: {old_hp} → {new_hp}/{enemy.hp_max} HP"
        )

        if new_hp == 0:
            result += " (DEFEATED)"

        logger.info(f"⚔️ {result}")
        return result

    else:
        raise ModelRetry(
            f"Target '{target}' not found. Use 'pc' or one of: {list(ctx.deps.enemies.keys())}"
        )


@agent.tool
def apply_condition(
    ctx: RunContext[GameState], target: str, condition: ConditionName
) -> str:
    """Apply a condition to the player character or an enemy.

    Conditions:
    - poisoned: Disadvantage on all rolls (removed by rest or healing spell)
    - stunned: Cannot take actions (removed after 1 turn or healing spell)
    - frightened: Disadvantage on attack rolls (removed by rest or spell)
    - restrained: Disadvantage on attacks and Evasion (escape via Might/Finesse check)
    - prone: Disadvantage on attacks; attackers have advantage (stand up to remove)

    Args:
        target: "pc" for player character, or enemy_id for an enemy
        condition: The condition to apply
    """
    if target == "pc":
        if ctx.deps.pc is None:
            raise ModelRetry("No player character initialized.")
        if condition not in ctx.deps.pc.conditions:
            ctx.deps.pc.conditions.append(condition)
            logger.info(f"😵 PC is now {condition}")
            return f"PC is now {condition}"
        return f"PC already has {condition}"

    elif target in ctx.deps.enemies:
        enemy = ctx.deps.enemies[target]
        if condition not in enemy.conditions:
            enemy.conditions.append(condition)
            logger.info(f"😵 '{target}' is now {condition}")
            return f"'{target}' is now {condition}"
        return f"'{target}' already has {condition}"

    else:
        raise ModelRetry(
            f"Target '{target}' not found. Use 'pc' or one of: {list(ctx.deps.enemies.keys())}"
        )


@agent.tool
def remove_condition(
    ctx: RunContext[GameState], target: str, condition: ConditionName
) -> str:
    """Remove a condition from the player character or an enemy.

    Args:
        target: "pc" for player character, or enemy_id for an enemy
        condition: The condition to remove
    """
    if target == "pc":
        if ctx.deps.pc is None:
            raise ModelRetry("No player character initialized.")
        if condition in ctx.deps.pc.conditions:
            ctx.deps.pc.conditions.remove(condition)
            logger.info(f"✨ PC is no longer {condition}")
            return f"PC is no longer {condition}"
        return f"PC did not have {condition}"

    elif target in ctx.deps.enemies:
        enemy = ctx.deps.enemies[target]
        if condition in enemy.conditions:
            enemy.conditions.remove(condition)
            logger.info(f"✨ '{target}' is no longer {condition}")
            return f"'{target}' is no longer {condition}"
        return f"'{target}' did not have {condition}"

    else:
        raise ModelRetry(
            f"Target '{target}' not found. Use 'pc' or one of: {list(ctx.deps.enemies.keys())}"
        )


@agent.tool
def update_character_state(
    ctx: RunContext[GameState],
    target: str,
    field: str,
    value: int,
) -> str:
    """Update a numeric field on the player character or enemy by setting it to a new value.

    Args:
        target: "pc" for player character, or enemy_id for an enemy
        field: Field to update (hp, mana, evasion, gold, etc.)
        value: New value to set
    """
    if target == "pc":
        if ctx.deps.pc is None:
            raise ModelRetry("No player character initialized.")

        pc = ctx.deps.pc
        if not hasattr(pc, field):
            raise ModelRetry(
                f"Field '{field}' not found on PC. Valid fields: hp, hp_max, mana, mana_max, evasion, gold, xp, level"
            )

        old_value = getattr(pc, field)
        setattr(pc, field, value)
        logger.info(f"📝 PC {field}: {old_value} → {value}")
        return f"PC {field}: {old_value} → {value}"

    elif target in ctx.deps.enemies:
        enemy = ctx.deps.enemies[target]
        if not hasattr(enemy, field):
            raise ModelRetry(
                f"Field '{field}' not found on enemy. Valid fields: hp, hp_max, evasion, attack_modifier"
            )

        old_value = getattr(enemy, field)
        setattr(enemy, field, value)
        logger.info(f"📝 '{target}' {field}: {old_value} → {value}")
        return f"'{target}' {field}: {old_value} → {value}"

    else:
        raise ModelRetry(
            f"Target '{target}' not found. Use 'pc' or one of: {list(ctx.deps.enemies.keys())}"
        )


@agent.tool
def create_countdown(ctx: RunContext[GameState], name: str, initial_value: int) -> str:
    """Create a new countdown tracker.

    Countdowns track looming events (rituals completing, reinforcements arriving, etc.).
    When a countdown reaches 0, its effect triggers.

    Args:
        name: Name/identifier for the countdown
        initial_value: Starting value (must be >= 0)
    """
    if name in ctx.deps.countdowns:
        raise ModelRetry(
            f"Countdown '{name}' already exists. Use update_countdown to modify it."
        )

    if initial_value < 0:
        raise ModelRetry(f"Countdown initial value must be >= 0, got {initial_value}")

    ctx.deps.countdowns[name] = initial_value
    logger.info(f"⏱️ Created countdown '{name}' with value {initial_value}")

    if initial_value == 0:
        return f"Created countdown '{name}' at 0 (TRIGGERS IMMEDIATELY!)"
    return f"Created countdown '{name}' with value {initial_value}"


@agent.tool
def update_countdown(ctx: RunContext[GameState], name: str, delta: int) -> str:
    """Update an existing countdown by applying a delta.

    Args:
        name: Name of the countdown
        delta: Change to apply (e.g., -1 to tick down, +1 to tick up)
    """
    if name not in ctx.deps.countdowns:
        raise ModelRetry(
            f"Countdown '{name}' not found. Available: {list(ctx.deps.countdowns.keys())}"
        )

    old_value = ctx.deps.countdowns[name]
    new_value = max(0, old_value + delta)
    ctx.deps.countdowns[name] = new_value

    logger.info(f"⏱️ Countdown '{name}': {old_value} → {new_value}")

    if new_value == 0 and old_value > 0:
        return f"Countdown '{name}': {old_value} → 0 (TRIGGERED!)"
    return f"Countdown '{name}': {old_value} → {new_value}"


# =============================================================================
# Main
# =============================================================================


def create_test_character() -> CharacterState:
    """Create a test character for development."""
    return CharacterState(
        name="Aldric",
        character_class="warrior",
        level=1,
        xp=0,
        stats=Stats(might=2, finesse=1, wit=0, presence=-1),
        hp=12,  # 10 + 2 (Might)
        hp_max=12,
        evasion=11,  # 10 + 1 (Finesse)
        mana=None,
        mana_max=None,
        class_abilities=["WAR-S1"],  # Weapon Focus
        gold=10,
        inventory=["Longsword", "Shield", "Leather Armor"],
        equipped_weapon="Longsword",
        equipped_armor="Leather Armor",
    )


async def run_chat():
    """Async chat loop."""
    logger.info("🎮 Virtual GM - Custom Ruleset")
    logger.info("=" * 50)
    logger.info("Type 'exit' or 'quit' to end")
    logger.info("=" * 50)
    logger.info("")

    # Initialize game state with test character
    game_state = GameState()
    game_state.pc = create_test_character()

    logger.info(
        f"Character loaded: {game_state.pc.name} (Level {game_state.pc.level} {game_state.pc.character_class})"
    )
    logger.info("")

    message_history = []

    while True:
        user_input = input("You: ").strip()

        if user_input.lower() in ("exit", "quit", "q"):
            logger.info("\n👋 Goodbye!")
            break

        if not user_input:
            continue

        logger.info("\n🤖 Game Master:")
        try:
            result = await agent.run(
                user_input,
                deps=game_state,
                message_history=message_history,
            )

            message_history = result.all_messages()

            if isinstance(result.output, EndGameMasterTurn):
                if result.output.internal_notes:
                    logger.debug(f"GM notes: {result.output.internal_notes}")

        except Exception as e:
            logger.error(f"Error: {e}")

        logger.info("")


@click.command()
def main():
    asyncio.run(run_chat())


if __name__ == "__main__":
    main()
