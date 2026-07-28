"""Agent tool definitions — all @gm_agent.tool and @gm_agent.tool_plain functions."""

import random
from pathlib import Path
from typing import Literal

from loguru import logger
from pydantic_ai import CallDeferred, ModelRetry, RunContext

from game.models import (
    DICE_SIDES,
    XP_THRESHOLDS,
    ConditionName,
    DiceType,
    EnemyState,
    GameState,
    is_pending_level_up,
)

# Import agent to register tools on it.
# This module is imported at the bottom of agent/definition.py, so `agent` is already created.
from agent.definition import gm_agent
from api.narration_sanitize import extract_leaked_ask_player_roll
from game.combat_lifecycle import (
    add_to_initiative,
    emit_combat_start,
    finish_combat,
    maybe_end_combat_when_encounter_cleared,
    remove_from_initiative,
    start_combat_state,
)


# ANSI color codes for terminal output (used by narrate for CLI)
class Colors:
    GREEN = "\033[32m"
    LIGHT_BLACK = "\033[90m"
    RESET = "\033[0m"


def _notify_state_changed(gs: GameState, *fields: str) -> None:
    """Signal the client that game state changed mid-turn (ping-to-refetch).

    Reuses the SSE event queue (same path as narrate/set_scene). The event carries
    only a hint of which fields changed — the authoritative state is read back by the
    client via GET /sessions/{id}/state. No-op outside an active stream (e.g. the
    in-process CLI), where _event_queue is None.
    """
    if gs._event_queue is not None:
        gs._event_queue.put_nowait(("state_changed", {"fields": list(fields)}))


def _discard_narration(ctx: RunContext[GameState]) -> None:
    """Drop the provisional bubble this call has been streaming into.

    The client painted text from these arguments while the model was still writing them, so
    every path out of narrate() that does NOT show the text has to say so explicitly —
    otherwise half a sentence is left standing on screen.
    """
    if ctx.deps._event_queue is not None:
        ctx.deps._event_queue.put_nowait(
            ("narration_discard", {"tool_call_id": ctx.tool_call_id})
        )


@gm_agent.tool
def narrate(ctx: RunContext[GameState], text: str) -> str:
    """Show text to the player.

    Args:
        text: Description, dialogue, or outcome for the current moment.
    """
    # Collect narration for API consumers
    cleaned, leaked = extract_leaked_ask_player_roll(text)
    if leaked is not None:
        ctx.deps._leaked_roll_args = leaked
    if not cleaned:
        _discard_narration(ctx)
        return "Narration omitted (roll prompt only)."
    text = cleaned
    if ctx.deps.awaiting_damage_roll:
        _discard_narration(ctx)
        raise ModelRetry(
            "Attack HIT — the player must roll damage first. Call ask_player_roll() "
            "for weapon damage (d4–d12), then apply_damage(), BEFORE narrate(). "
            "Do not describe wounds, defeat, or death yet."
        )
    ctx.deps.narrations.append(text)
    # Push to SSE stream if active. This is also the settle signal: the tool_call_id ties it
    # to the narration_delta frames the client has been painting.
    if ctx.deps._event_queue is not None:
        ctx.deps._event_queue.put_nowait(
            ("narration", {"text": text, "tool_call_id": ctx.tool_call_id})
        )
    # Also log for CLI consumers
    logger.info(f"{Colors.GREEN}{text}{Colors.RESET}")
    return f"Narration was shown to the player: {text[:50]}..."


@gm_agent.tool
def load_campaign_section(ctx: RunContext[GameState], section: str) -> str:
    """Load a campaign section into context as the story reaches it. Sections stay
    loaded for the rest of the session (phased loading). See the campaign index for
    available section paths.

    Args:
        section: Section path from the campaign index (e.g., "Part1_Goblin_Arrows/Goblin_Ambush")
    """
    if section in ctx.deps.loaded_sections:
        return f"Section '{section}' is already loaded."

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
def set_scene(ctx: RunContext[GameState], scene_label: str) -> str:
    """Update the current scene label shown in the session app bar.

    Args:
        scene_label: Short scene name (e.g. "Tavern, dusk", "Combat — Goblin ambush")
    """
    ctx.deps.scene_label = scene_label
    if ctx.deps._event_queue is not None:
        ctx.deps._event_queue.put_nowait(
            ("scene", {"text": f"Scene · {scene_label}"})
        )
    _notify_state_changed(ctx.deps, "scene_label")
    return f"Scene set to {scene_label}"


@gm_agent.tool
def ask_player_roll(
    ctx: RunContext[GameState],
    dice_count: int,
    dice_type: DiceType,
    purpose: str,
    stat: str | None = None,
    modifier: int | None = None,
    dc: int | None = None,
    vs_label: str | None = None,
    adv_type: str | None = None,
    adv_reason: str | None = None,
    success_text: str | None = None,
    fail_text: str | None = None,
    footer: str | None = None,
) -> str:
    """Request the player to roll dice. Defers execution until the player provides their result.

    Args:
        dice_count: Number of dice to roll
        dice_type: Type of die (d4, d6, d8, d10, d12, d20, d100)
        purpose: Brief description of what the roll is for (e.g., "attack roll", "damage", "Wit check")
        stat: Stat key or short label (might/Mig, finesse/Fin, wit, presence/Pre)
        modifier: Modifier to add (defaults from character stat when omitted)
        dc: Required for d20 skill checks and saves — difficulty target (easy 8, moderate 12, hard 15). Solo mode lowers this by 2 server-side.
        vs_label: Display label (e.g. "vs Eva 14")
        adv_type: norm, adv, or dis
        adv_reason: Why advantage/disadvantage applies
        success_text: Narrative on success (shown on roll card)
        fail_text: Narrative on failure
        footer: Small print under the roll button
    """
    raise CallDeferred(
        metadata={
            "tool": "ask_player_roll",
            "dice_count": dice_count,
            "dice_type": dice_type,
            "purpose": purpose,
            "stat": stat,
            "modifier": modifier,
            "dc": dc,
            "vs_label": vs_label,
            "adv_type": adv_type,
            "adv_reason": adv_reason,
            "success_text": success_text,
            "fail_text": fail_text,
            "footer": footer,
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
    is_boss: bool = False,
) -> str:
    """Create an enemy in the encounter.

    Args:
        enemy_id: Unique identifier for the enemy (e.g., "Goblin 1")
        hp_max: Maximum hit points
        evasion: Evasion value (target number to hit)
        attack_modifier: Bonus to attack rolls
        damage: Damage expression (e.g., "1d6+2")
        is_boss: True for a campaign-designated boss. Marks the encounter as a
            boss battle (set before any damage is dealt); auto-clears when this
            enemy is defeated.
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
        is_boss=is_boss,
    )
    ctx.deps.enemies[enemy_id] = enemy

    if is_boss:
        ctx.deps.is_boss_battle = True

    fields = ["enemies"]
    if is_boss:
        fields.append("boss_encounter")
    if ctx.deps.in_combat and add_to_initiative(ctx.deps, enemy_id):
        fields.extend(["initiative_order", "current_turn_index"])
    _notify_state_changed(ctx.deps, *fields)

    boss_note = " 👑 BOSS — boss battle STARTED" if is_boss else ""
    logger.info(
        f"Created enemy '{enemy_id}' (HP: {hp_max}, Evasion: {evasion}, Attack: +{attack_modifier}, Damage: {damage}){boss_note}"
    )
    return f"Created '{enemy_id}' with {hp_max} HP, Evasion {evasion}{boss_note}"


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
    ended = maybe_end_combat_when_encounter_cleared(ctx.deps)
    fields = ["enemies"]
    if ctx.deps.in_combat and remove_from_initiative(ctx.deps, enemy_id):
        fields.extend(["initiative_order", "current_turn_index"])
    if ended:
        fields.extend(["in_combat", "initiative_order", "current_turn_index"])
    _notify_state_changed(ctx.deps, *fields)
    logger.info(f"Removed enemy '{enemy_id}'")
    return f"Removed '{enemy_id}'"


@gm_agent.tool
def start_combat(ctx: RunContext[GameState], initiative_order: list[str]) -> str:
    """Begin combat and set initiative order (call immediately before initiative rolls).

    Args:
        initiative_order: Combatant display names in initiative order (e.g. ["Aldric", "Goblin 1"])
    """
    if ctx.deps.in_combat:
        raise ModelRetry(
            "Combat is already active. Reinforcements use create_enemy() only — "
            "do not call start_combat again until this encounter ends."
        )
    if not initiative_order:
        raise ModelRetry("initiative_order must include at least one combatant.")

    start_combat_state(ctx.deps, initiative_order)
    emit_combat_start(ctx.deps, initiative_order)
    _notify_state_changed(
        ctx.deps, "in_combat", "initiative_order", "current_turn_index"
    )

    order_str = " → ".join(initiative_order)
    logger.info(f"⚔️ Combat started. Initiative: {order_str}")
    return f"Combat started. Initiative order: {order_str}"


@gm_agent.tool
def end_combat(ctx: RunContext[GameState], reason: str = "") -> str:
    """End combat (victory, flee, or narrative resolution).

    Args:
        reason: Optional short reason (e.g. "fled", "surrendered")
    """
    if not ctx.deps.in_combat:
        return "Combat was not active."

    finish_combat(ctx.deps, reason=reason.strip())
    _notify_state_changed(
        ctx.deps,
        "in_combat",
        "initiative_order",
        "current_turn_index",
        "scene_label",
    )
    suffix = f" ({reason})" if reason.strip() else ""
    logger.info(f"⚔️ Combat ended{suffix}")
    return f"Combat ended{suffix}"


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

        combat_ended = False
        if new_hp == 0:
            if ctx.deps.is_boss_battle:
                result += " (DEFEATED in boss battle - player must choose: Blaze of Glory or Risk It All)"
            else:
                result += (
                    " (DEFEATED, non-boss - the PC survives, not death. Resolve the"
                    " aftermath per ruleset section 9.2 and remove the remaining enemies"
                    " to end the encounter.)"
                )
                if ctx.deps.in_combat and finish_combat(ctx.deps, reason="pc defeated"):
                    combat_ended = True

        fields = ["hp"]
        if combat_ended:
            fields.extend(
                ["in_combat", "initiative_order", "current_turn_index", "scene_label"]
            )
        _notify_state_changed(ctx.deps, *fields)
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

        boss_ended = False
        initiative_changed = False
        if new_hp == 0:
            result += " (DEFEATED)"
            if enemy.is_boss and ctx.deps.is_boss_battle:
                ctx.deps.is_boss_battle = False
                boss_ended = True
                result += " 👑 BOSS DEFEATED — boss battle ENDED"
            if ctx.deps.in_combat and remove_from_initiative(ctx.deps, target):
                initiative_changed = True

        fields = ["enemies"]
        if boss_ended:
            fields.append("boss_encounter")
        if initiative_changed:
            fields.extend(["initiative_order", "current_turn_index"])
        _notify_state_changed(ctx.deps, *fields)
        logger.info(f"⚔️ {result}")
        return result

    else:
        raise ModelRetry(
            f"Target '{target}' not found. Use 'pc' or one of: {list(ctx.deps.enemies.keys())}"
        )


@gm_agent.tool
def heal(ctx: RunContext[GameState], target: str, amount: int) -> str:
    """Restore hit points to the player character or an enemy.

    Args:
        target: "pc" for player character, or enemy_id for an enemy
        amount: HP to restore (non-negative; capped at the target's max HP)
    """
    if amount < 0:
        raise ModelRetry("Heal amount must be non-negative. Use apply_damage instead.")

    if target == "pc":
        if ctx.deps.pc is None:
            raise ModelRetry("No player character initialized.")
        old_hp = ctx.deps.pc.hp
        ctx.deps.pc.hp = min(ctx.deps.pc.hp_max, ctx.deps.pc.hp + amount)
        new_hp = ctx.deps.pc.hp
        _notify_state_changed(ctx.deps, "hp")
        result = f"PC healed {amount}: {old_hp} → {new_hp}/{ctx.deps.pc.hp_max} HP"
        logger.info(f"💚 {result}")
        return result

    if target in ctx.deps.enemies:
        enemy = ctx.deps.enemies[target]
        old_hp = enemy.hp
        enemy.hp = min(enemy.hp_max, enemy.hp + amount)
        new_hp = enemy.hp
        _notify_state_changed(ctx.deps, "enemies")
        result = f"'{target}' healed {amount}: {old_hp} → {new_hp}/{enemy.hp_max} HP"
        logger.info(f"💚 {result}")
        return result

    raise ModelRetry(
        f"Target '{target}' not found. Use 'pc' or one of: {list(ctx.deps.enemies.keys())}"
    )


@gm_agent.tool
def set_condition(
    ctx: RunContext[GameState],
    target: str,
    condition: ConditionName,
    active: bool,
) -> str:
    """Apply or clear a condition on the player character or an enemy.

    Args:
        target: "pc" for player character, or enemy_id for an enemy
        condition: The condition to set
        active: True to inflict the condition, False to clear it (expired, healed, escaped)
    """
    if target == "pc":
        if ctx.deps.pc is None:
            raise ModelRetry("No player character initialized.")
        conditions = ctx.deps.pc.conditions
        label = "PC"
        field_hint = "conditions"
    elif target in ctx.deps.enemies:
        conditions = ctx.deps.enemies[target].conditions
        label = f"'{target}'"
        field_hint = "enemies"
    else:
        raise ModelRetry(
            f"Target '{target}' not found. Use 'pc' or one of: {list(ctx.deps.enemies.keys())}"
        )

    if active:
        if condition in conditions:
            return f"{label} already has {condition}"
        conditions.append(condition)
        _notify_state_changed(ctx.deps, field_hint)
        logger.info(f"😵 {label} is now {condition}")
        return f"{label} is now {condition}"

    if condition not in conditions:
        return f"{label} did not have {condition}"
    conditions.remove(condition)
    _notify_state_changed(ctx.deps, field_hint)
    logger.info(f"✨ {label} is no longer {condition}")
    return f"{label} is no longer {condition}"


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
        _notify_state_changed(ctx.deps, field)
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
        _notify_state_changed(ctx.deps, "enemies")
        logger.info(f"📝 '{target}' {field}: {old_value} → {value}")
        return f"'{target}' {field}: {old_value} → {value}"

    else:
        raise ModelRetry(
            f"Target '{target}' not found. Use 'pc' or one of: {list(ctx.deps.enemies.keys())}"
        )


@gm_agent.tool
def set_countdown(
    ctx: RunContext[GameState],
    name: str,
    value: int,
    mode: Literal["create", "adjust"],
) -> str:
    """Create or adjust a countdown tracker. Triggers when it reaches 0.

    Args:
        name: Name/identifier for the countdown.
        value: For mode="create", the starting value (must be >= 0). For
            mode="adjust", the delta to apply (e.g. -1 to tick down, +1 to tick up).
        mode: "create" for a new countdown, "adjust" to change an existing one.
    """
    if mode == "create":
        if name in ctx.deps.countdowns:
            raise ModelRetry(
                f"Countdown '{name}' already exists. Use mode='adjust' to modify it."
            )
        if value < 0:
            raise ModelRetry(f"Countdown initial value must be >= 0, got {value}")

        ctx.deps.countdowns[name] = value
        _notify_state_changed(ctx.deps, "countdowns")
        logger.info(f"⏱️ Created countdown '{name}' with value {value}")
        if value == 0:
            return f"Created countdown '{name}' at 0 (TRIGGERS IMMEDIATELY!)"
        return f"Created countdown '{name}' with value {value}"

    if name not in ctx.deps.countdowns:
        raise ModelRetry(
            f"Countdown '{name}' not found. Use mode='create' first. "
            f"Available: {list(ctx.deps.countdowns.keys())}"
        )

    old_value = ctx.deps.countdowns[name]
    new_value = max(0, old_value + value)
    ctx.deps.countdowns[name] = new_value
    _notify_state_changed(ctx.deps, "countdowns")
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

    pc = ctx.deps.pc
    old_xp = pc.xp
    pc.xp += amount

    result = f"Awarded {amount} XP for '{reason}': {old_xp} → {pc.xp} XP"
    logger.info(f"⭐ {result}")

    if is_pending_level_up(pc.xp, pc.level):
        result += (
            "\nThe player has enough XP to level up — they will choose "
            "HP increase, +1 Evasion, or a class ability when combat allows."
        )

    _notify_state_changed(ctx.deps, "xp", "pending_level_up")
    return result


@gm_agent.tool
def update_inventory(
    ctx: RunContext[GameState], item: str, action: Literal["add", "remove"]
) -> str:
    """Add or remove an item from the player character's inventory.

    Args:
        item: Name of the item (for "remove", must match exactly).
        action: "add" to add the item, "remove" to drop/use/lose it.
    """
    if ctx.deps.pc is None:
        raise ModelRetry("No player character initialized.")

    if action == "add":
        ctx.deps.pc.inventory.append(item)
        _notify_state_changed(ctx.deps, "inventory")
        logger.info(f"🎒 Added '{item}' to inventory")
        return f"Added '{item}' to inventory. Inventory: {ctx.deps.pc.inventory}"

    if item not in ctx.deps.pc.inventory:
        raise ModelRetry(
            f"Item '{item}' not in inventory. Current inventory: {ctx.deps.pc.inventory}"
        )

    ctx.deps.pc.inventory.remove(item)
    _notify_state_changed(ctx.deps, "inventory")
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
