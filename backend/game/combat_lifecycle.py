"""Combat mode transitions — shared by agent tools and tests."""

from __future__ import annotations

from typing import TYPE_CHECKING

from api.combat_roll_guards import is_combat_scene_label

if TYPE_CHECKING:
    from game.models import GameState
    from game.session import Session


def snapshot_dict_for_gs(gs: GameState) -> dict:
    from api.snapshot import game_state_snapshot

    return game_state_snapshot(gs).model_dump()


def _session(gs: GameState) -> Session | None:
    return getattr(gs, "_session", None)


def emit_combat_start(gs: GameState, initiative_order: list[str]) -> None:
    payload = {
        "initiative_order": list(initiative_order),
        "game_state": snapshot_dict_for_gs(gs),
    }
    gs.emit("combat_start", payload)
    session = _session(gs)
    if session is not None:
        from api.transcript_log import append_combat_start

        append_combat_start(session, initiative_order=list(initiative_order))


def emit_combat_end(gs: GameState, reason: str = "") -> None:
    payload: dict = {"game_state": snapshot_dict_for_gs(gs)}
    if reason:
        payload["reason"] = reason
    gs.emit("combat_end", payload)
    session = _session(gs)
    if session is not None:
        from api.transcript_log import append_combat_end

        append_combat_end(session, reason=reason or None)


def start_combat_state(gs: GameState, initiative_order: list[str]) -> None:
    if not initiative_order:
        raise ValueError("initiative_order must not be empty")
    if not is_combat_scene_label(gs.scene_label):
        gs.scene_label_before_combat = gs.scene_label
    gs.in_combat = True
    gs.initiative_order = list(initiative_order)
    gs.current_turn_index = 0
    gs.awaiting_damage_roll = False


def end_combat_state(gs: GameState) -> bool:
    """Clear combat mode. Returns True if combat was active."""
    if not gs.in_combat:
        return False
    gs.in_combat = False
    gs.initiative_order = []
    gs.current_turn_index = 0
    gs.awaiting_damage_roll = False
    if gs.scene_label_before_combat and is_combat_scene_label(gs.scene_label):
        gs.scene_label = gs.scene_label_before_combat
    gs.scene_label_before_combat = None
    if not any(enemy.is_boss for enemy in gs.enemies.values()):
        gs.is_boss_battle = False
    return True


def finish_combat(gs: GameState, reason: str = "") -> bool:
    """End combat and emit SSE + transcript. No-op if not in combat."""
    if not end_combat_state(gs):
        return False
    emit_combat_end(gs, reason=reason)
    return True


def _resolve_initiative_name(gs: GameState, combatant: str) -> str | None:
    """Match a combatant id or enemy name to an initiative-order entry."""
    if combatant in gs.initiative_order:
        return combatant
    enemy = gs.enemies.get(combatant)
    if enemy and enemy.name in gs.initiative_order:
        return enemy.name
    for name in gs.initiative_order:
        if name.lower() == combatant.lower():
            return name
    return None


def add_to_initiative(gs: GameState, combatant: str) -> bool:
    """Append a combatant to initiative (e.g. mid-fight reinforcement)."""
    if not gs.in_combat:
        return False
    if _resolve_initiative_name(gs, combatant) is not None:
        return False
    enemy = gs.enemies.get(combatant)
    name = enemy.name if enemy else combatant
    gs.initiative_order.append(name)
    return True


def remove_from_initiative(gs: GameState, combatant: str) -> bool:
    """Drop a combatant from initiative and keep the turn pointer valid."""
    name = _resolve_initiative_name(gs, combatant)
    if name is None:
        return False
    idx = gs.initiative_order.index(name)
    gs.initiative_order.pop(idx)
    if not gs.initiative_order:
        gs.current_turn_index = 0
        return True
    if idx < gs.current_turn_index:
        gs.current_turn_index = max(0, gs.current_turn_index - 1)
    elif idx == gs.current_turn_index:
        gs.current_turn_index %= len(gs.initiative_order)
    return True


def maybe_end_combat_when_encounter_cleared(gs: GameState) -> bool:
    """Auto-end combat when the last enemy is removed."""
    if not gs.in_combat or gs.enemies:
        return False
    return finish_combat(gs, reason="all enemies defeated")
