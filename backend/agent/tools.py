"""Agent tool definitions — all @gm_agent.tool and @gm_agent.tool_plain functions."""

import random
from pathlib import Path

from loguru import logger
from pydantic_ai import CallDeferred, ModelRetry, RunContext

from game.models import (
    DICE_SIDES,
    XP_THRESHOLDS,
    ConditionName,
    DiceType,
    EnemyState,
    GameState,
)

# Import agent to register tools on it.
# This module is imported at the bottom of agent/definition.py, so `agent` is already created.
from agent.definition import gm_agent


# ANSI color codes for terminal output (used by narrate for CLI)
class Colors:
    GREEN = "\033[32m"
    LIGHT_BLACK = "\033[90m"
    RESET = "\033[0m"


@gm_agent.tool
def narrate(ctx: RunContext[GameState], text: str) -> str:
    """Show text to the player. This is the ONLY way to communicate with the player — anything not passed through narrate() is invisible to them.

    Args:
        text: ALL player-facing content: narration, dialogue, scene descriptions, and questions.
    """
    # Collect narration for API consumers
    ctx.deps.narrations.append(text)
    # Push to SSE stream if active
    if ctx.deps._event_queue is not None:
        ctx.deps._event_queue.put_nowait(("narration", {"text": text}))
    # Also log for CLI consumers
    logger.info(f"{Colors.GREEN}{text}{Colors.RESET}")
    return f"Narration was shown to the player: {text[:50]}..."


@gm_agent.tool
def load_campaign_section(ctx: RunContext[GameState], section: str) -> str:
    """Load a campaign section into context. See the campaign index for available section paths.

    Args:
        section: Section path from the campaign index (e.g., "Part1_Goblin_Arrows/Goblin_Ambush")
    """
    if section in ctx.deps.loaded_sections:
        return f"Section '{section}' is already loaded."

    if len(ctx.deps.loaded_sections) >= ctx.deps.max_loaded_sections:
        loaded = list(ctx.deps.loaded_sections.keys())
        raise ModelRetry(
            f"Cannot load — already at capacity ({ctx.deps.max_loaded_sections} sections loaded): {loaded}. "
            f"Use unload_campaign_section to free a slot first."
        )

    if ctx.deps.campaign_dir is None:
        raise ModelRetry("No campaign directory configured.")

    file_path = Path(ctx.deps.campaign_dir) / f"{section}.md"
    if not file_path.is_file():
        raise ModelRetry(
            f"Section '{section}' not found. Check the campaign index for valid section paths."
        )

    content = file_path.read_text(encoding="utf-8")
    ctx.deps.loaded_sections[section] = content

    logger.info(f"📖 Loaded campaign section: {section}")
    return f"Loaded '{section}' into context."


@gm_agent.tool
def unload_campaign_section(ctx: RunContext[GameState], section: str) -> str:
    """Remove a campaign section from context to free a slot.

    Args:
        section: Section path to unload
    """
    if section not in ctx.deps.loaded_sections:
        loaded = list(ctx.deps.loaded_sections.keys())
        raise ModelRetry(
            f"Section '{section}' is not loaded. Currently loaded: {loaded}"
        )

    del ctx.deps.loaded_sections[section]
    logger.info(f"📖 Unloaded campaign section: {section}")
    return f"Unloaded '{section}' from context."


@gm_agent.tool_plain
def roll_dice(
    dice_count: int,
    dice_type: DiceType,
    advantage: bool = False,
    disadvantage: bool = False,
) -> str:
    """Roll dice and return the result.

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


@gm_agent.tool
def ask_player_roll(
    ctx: RunContext[GameState],
    dice_count: int,
    dice_type: DiceType,
    purpose: str,
) -> str:
    """Request the player to roll dice. Defers execution until the player provides their result.

    Args:
        dice_count: Number of dice to roll
        dice_type: Type of die (d4, d6, d8, d10, d12, d20, d100)
        purpose: Brief description of what the roll is for (e.g., "attack roll", "damage", "Wit check")
    """
    raise CallDeferred(
        metadata={
            "tool": "ask_player_roll",
            "dice_count": dice_count,
            "dice_type": dice_type,
            "purpose": purpose,
        }
    )


@gm_agent.tool
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


@gm_agent.tool
def remove_enemy(ctx: RunContext[GameState], enemy_id: str) -> str:
    """Remove an enemy from the encounter.

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


@gm_agent.tool
def set_boss_battle(ctx: RunContext[GameState], active: bool) -> str:
    """Toggle boss battle mode for the current encounter.

    Args:
        active: True to start a boss battle, False to end it
    """
    ctx.deps.is_boss_battle = active
    status = "STARTED" if active else "ENDED"
    logger.info(f"👑 Boss battle {status}")
    return f"Boss battle {status}"


@gm_agent.tool
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


@gm_agent.tool
def apply_condition(
    ctx: RunContext[GameState], target: str, condition: ConditionName
) -> str:
    """Apply a condition to the player character or an enemy.

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


@gm_agent.tool
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


@gm_agent.tool
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


@gm_agent.tool
def create_countdown(ctx: RunContext[GameState], name: str, initial_value: int) -> str:
    """Create a new countdown tracker. Triggers when it reaches 0.

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


@gm_agent.tool
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


@gm_agent.tool
def award_xp(ctx: RunContext[GameState], amount: int, reason: str) -> str:
    """Award experience points to the player character.

    Args:
        amount: XP to award (must be positive)
        reason: Why the XP is being awarded (e.g., "defeated skeleton", "completed quest")
    """
    if ctx.deps.pc is None:
        raise ModelRetry("No player character initialized.")
    if amount <= 0:
        raise ModelRetry("XP amount must be positive.")
    if ctx.deps.in_combat:
        raise ModelRetry("Cannot award XP during combat. Award XP after combat ends.")

    pc = ctx.deps.pc
    old_xp = pc.xp
    pc.xp += amount

    result = f"Awarded {amount} XP for '{reason}': {old_xp} → {pc.xp} XP"
    logger.info(f"⭐ {result}")

    # Check for level-up
    if pc.level < 10:
        next_threshold = XP_THRESHOLDS.get(pc.level + 1)
        if next_threshold and pc.xp >= next_threshold:
            old_level = pc.level
            pc.level += 1
            result += (
                f"\n🎉 LEVEL UP! {old_level} → {pc.level}! "
                f"The player must choose one: HP increase, +1 Evasion, or a class ability."
            )
            logger.info(f"🎉 Level up! {old_level} → {pc.level}")

    return result


@gm_agent.tool
def add_to_inventory(ctx: RunContext[GameState], item: str) -> str:
    """Add an item to the player character's inventory.

    Args:
        item: Name of the item to add
    """
    if ctx.deps.pc is None:
        raise ModelRetry("No player character initialized.")

    ctx.deps.pc.inventory.append(item)
    logger.info(f"🎒 Added '{item}' to inventory")
    return f"Added '{item}' to inventory. Inventory: {ctx.deps.pc.inventory}"


@gm_agent.tool
def remove_from_inventory(ctx: RunContext[GameState], item: str) -> str:
    """Remove an item from the player character's inventory.

    Args:
        item: Name of the item to remove (must match exactly)
    """
    if ctx.deps.pc is None:
        raise ModelRetry("No player character initialized.")

    if item not in ctx.deps.pc.inventory:
        raise ModelRetry(
            f"Item '{item}' not in inventory. Current inventory: {ctx.deps.pc.inventory}"
        )

    ctx.deps.pc.inventory.remove(item)
    logger.info(f"🎒 Removed '{item}' from inventory")
    return f"Removed '{item}' from inventory. Inventory: {ctx.deps.pc.inventory}"


# =============================================================================
# Deferred Tool Handlers (used by CLI)
# =============================================================================


def handle_ask_player_roll(args: dict, game_state: GameState) -> str:
    """Handle the ask_player_roll deferred tool - prompt player to roll, auto-roll, or respond with text."""
    dice_count = args["dice_count"]
    dice_type = args["dice_type"]
    purpose = args["purpose"]

    sides = DICE_SIDES[dice_type]

    while True:
        roll_input = input(
            f"🎲 Roll {dice_count}{dice_type} for {purpose} (or press Enter to auto-roll): "
        ).strip()

        if not roll_input:
            # Auto-roll if user pressed Enter
            rolls = [random.randint(1, sides) for _ in range(dice_count)]
            break

        # Try to parse as dice roll
        if dice_count == 1:
            # Single die - check if input is a valid number
            if roll_input.isdigit():
                roll_value = int(roll_input)
                if 1 <= roll_value <= sides:
                    rolls = [roll_value]
                    break
                else:
                    logger.error(f"Value must be between 1 and {sides}.")
                    continue
        else:
            # Multiple dice - try to parse as numbers
            parts = [
                p.strip()
                for p in roll_input.replace(",", " ").split()
                if p.strip().isdigit()
            ]
            if len(parts) == dice_count:
                rolls = [int(x) for x in parts]
                if all(1 <= r <= sides for r in rolls):
                    break
                else:
                    logger.error(f"All values must be between 1 and {sides}.")
                    continue

        # Input is not a valid dice roll - treat as player response/question
        logger.info(f"💬 Player response: {roll_input}")
        return f"Player response (did not roll): {roll_input}"

    # Format result string for successful roll
    total = sum(rolls)
    if dice_count == 1:
        result_str = f"🎲 [{dice_count}{dice_type}] → {total}"
        # Check for natural 20 on d20 rolls
        if dice_type == "d20" and total == 20:
            result_str += " (NATURAL 20 - CRITICAL HIT!)"
    else:
        result_str = f"🎲 [{dice_count}{dice_type}] → {rolls} = {total}"

    logger.info(result_str)
    return result_str
