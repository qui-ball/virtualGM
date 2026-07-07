"""Shared dice roll logic (aligned with frontend src/lib/play/roll.ts)."""

import random
from typing import Literal

from game.models import DICE_SIDES, DiceType

AdvType = Literal["norm", "adv", "dis"]


def roll_die(sides: int = 20) -> int:
    return random.randint(1, sides)


def roll_d20(
    *,
    adv: AdvType = "norm",
    modifier: int = 0,
    vs: int | None = None,
) -> dict:
    die_a = roll_die(20)
    die_b = roll_die(20) if adv != "norm" else None
    if adv == "adv" and die_b is not None:
        nat = max(die_a, die_b)
    elif adv == "dis" and die_b is not None:
        nat = min(die_a, die_b)
    else:
        nat = die_a
    total = nat + modifier
    crit = nat == 20
    fumble = nat == 1
    passed = total >= vs if vs is not None else None
    return {
        "die_a": die_a,
        "die_b": die_b,
        "nat": nat,
        "total": total,
        "modifier": modifier,
        "adv_used": adv,
        "crit": crit,
        "fumble": fumble,
        "pass": passed,
    }


def resolve_d20_from_rolls(
    rolls: list[int],
    *,
    adv: AdvType = "norm",
    modifier: int = 0,
    vs: int | None = None,
) -> dict:
    """Build structured result when the client supplies physical dice."""
    if not rolls:
        return roll_d20(adv=adv, modifier=modifier, vs=vs)
    if adv != "norm" and len(rolls) >= 2:
        die_a, die_b = rolls[0], rolls[1]
        nat = max(die_a, die_b) if adv == "adv" else min(die_a, die_b)
    else:
        die_a = rolls[0]
        die_b = None
        nat = die_a
    total = nat + modifier
    crit = nat == 20
    fumble = nat == 1
    passed = total >= vs if vs is not None else None
    return {
        "die_a": die_a,
        "die_b": die_b,
        "nat": nat,
        "total": total,
        "modifier": modifier,
        "adv_used": adv,
        "crit": crit,
        "fumble": fumble,
        "pass": passed,
    }


def resolve_dice_from_rolls(
    rolls: list[int],
    *,
    dice_count: int,
    dice_type: DiceType,
    modifier: int = 0,
) -> dict:
    """Resolve non-d20 (or multi-die) player rolls from individual die values."""
    sides = DICE_SIDES[dice_type]
    if not rolls:
        rolls = [roll_die(sides) for _ in range(dice_count)]
    else:
        rolls = rolls[:dice_count]

    roll_sum = sum(rolls)
    total = roll_sum + modifier
    return {
        "dice_type": dice_type,
        "dice_count": dice_count,
        "rolls": rolls,
        "die_a": rolls[0] if rolls else 1,
        "die_b": rolls[1] if len(rolls) > 1 else None,
        "nat": rolls[0] if rolls else 1,
        "total": total,
        "modifier": modifier,
        "adv_used": "norm",
        "crit": False,
        "fumble": False,
        "pass": None,
    }
