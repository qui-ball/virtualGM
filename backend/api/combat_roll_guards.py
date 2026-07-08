"""Combat roll sequencing guards — attack hit before damage, etc."""

from __future__ import annotations

import re

from api.schemas import PendingAction, RollResultPayload
from game.models import GameState

_ATTACK_PURPOSE = re.compile(r"attack|hit|strike|weapon|longsword|bow", re.I)
_COMBAT_SCENE = re.compile(r"^combat\s*[—–-]", re.I)


def is_combat_scene_label(label: str) -> bool:
    return bool(_COMBAT_SCENE.match(label.strip()))


def is_attack_pending_action(pending: PendingAction) -> bool:
    vs_label = pending.vs_label or ""
    if re.search(r"eva|evasion|\bac\b", vs_label, re.I):
        return True
    purpose = pending.purpose or ""
    return bool(_ATTACK_PURPOSE.search(purpose))


def is_damage_pending_action(pending: PendingAction) -> bool:
    if pending.dice_type == "d20":
        return False
    purpose = (pending.purpose or "").lower()
    return "damage" in purpose


def note_roll_result_resolution(
    gs: GameState,
    pending: PendingAction,
    payload: RollResultPayload,
) -> None:
    """Track whether the GM must request a damage roll before narrating."""
    if pending.dice_type == "d20" and pending.dice_count == 1:
        if is_attack_pending_action(pending):
            gs.awaiting_damage_roll = bool(payload.pass_)
        return
    if is_damage_pending_action(pending) or pending.dice_type != "d20":
        gs.awaiting_damage_roll = False


def roll_result_agent_suffix(gs: GameState) -> str:
    if gs.awaiting_damage_roll:
        return (
            " → HIT confirmed. Call ask_player_roll() for weapon damage next, then "
            "apply_damage(). Do NOT narrate() the outcome until damage is resolved."
        )
    return ""
