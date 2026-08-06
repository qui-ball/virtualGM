"""Apply level-up choices server-side (G7).

Every level-up grants HP (fixed or rolled). The request ``kind`` is the
secondary bonus: +1 evasion or a class ability.
"""

import random

from game.models import CLASS_HIT_DICE, DICE_SIDES, CharacterState, DiceType, XP_THRESHOLDS


def _hit_sides(character_class: str) -> int:
    die: DiceType = CLASS_HIT_DICE.get(character_class.lower(), "d8")  # type: ignore[arg-type]
    return DICE_SIDES[die]


def _apply_hp(
    character: CharacterState,
    *,
    hp_mode: str,
    hp_amount: int | None,
) -> CharacterState:
    updated = character.model_copy(deep=True)
    might = updated.stats.might
    sides = _hit_sides(updated.character_class)
    amount = hp_amount
    if amount is None:
        if hp_mode == "roll":
            amount = random.randint(1, sides) + max(0, might)
        else:
            amount = max(1, (sides // 2) + might)
    amount = max(1, int(amount))
    updated.hp_max += amount
    updated.hp = min(updated.hp + amount, updated.hp_max)
    return updated


def apply_level_up(
    character: CharacterState,
    *,
    kind: str,
    hp_mode: str | None = None,
    hp_amount: int | None = None,
    ability_id: str | None = None,
) -> CharacterState:
    if character.level >= 10:
        return character

    next_level = character.level + 1
    threshold = XP_THRESHOLDS.get(next_level)
    if threshold is None or character.xp < threshold:
        raise ValueError("Character is not eligible for level up")

    if kind not in {"evasion", "ability", "hp"}:
        raise ValueError(f"Unknown level-up kind: {kind}")

    mode = hp_mode or "fixed"
    updated = _apply_hp(character, hp_mode=mode, hp_amount=hp_amount)
    updated.level = next_level

    # Legacy clients could send kind=hp with no secondary bonus.
    if kind == "hp":
        return updated

    if kind == "evasion":
        updated.evasion += 1
        return updated

    if not ability_id:
        raise ValueError("Ability level-up requires an ability_id")
    if ability_id not in updated.class_abilities:
        updated.class_abilities = [*updated.class_abilities, ability_id]
    return updated
