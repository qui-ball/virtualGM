"""Apply level-up choices server-side (G7)."""

import random

from game.models import CLASS_HIT_DICE, DICE_SIDES, CharacterState, DiceType, XP_THRESHOLDS


def _hit_sides(character_class: str) -> int:
    die: DiceType = CLASS_HIT_DICE.get(character_class.lower(), "d8")  # type: ignore[arg-type]
    return DICE_SIDES[die]


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

    updated = character.model_copy(deep=True)
    updated.level = next_level

    if kind == "hp":
        might = updated.stats.might
        sides = _hit_sides(updated.character_class)
        if hp_amount is None:
            if hp_mode == "roll":
                hp_amount = random.randint(1, sides) + max(0, might)
            else:
                hp_amount = max(1, (sides // 2) + 1) + max(0, might)
        updated.hp_max += hp_amount
        updated.hp = min(updated.hp + hp_amount, updated.hp_max)
    elif kind == "evasion":
        updated.evasion += 1
    elif kind == "ability" and ability_id:
        if ability_id not in updated.class_abilities:
            updated.class_abilities = [*updated.class_abilities, ability_id]

    return updated
