"""Serialize / hydrate GameState for durable playthrough snapshots (Feature 07)."""

from __future__ import annotations

from typing import Any

from game.models import CharacterState, EnemyState, GameState


def game_state_to_dict(gs: GameState) -> dict[str, Any]:
    """Durable snapshot — excludes runtime-only fields."""
    return {
        "pc": gs.pc.model_dump() if gs.pc is not None else None,
        "enemies": {k: v.model_dump() for k, v in gs.enemies.items()},
        "npcs": dict(getattr(gs, "npcs", {}) or {}),
        "campaign_title": gs.campaign_title,
        "chapter": gs.chapter,
        "scene_label": gs.scene_label,
        "scene_label_before_combat": gs.scene_label_before_combat,
        "time_current": gs.time_current,
        "time_max": gs.time_max,
        "countdowns": dict(gs.countdowns),
        "in_combat": gs.in_combat,
        "is_boss_battle": gs.is_boss_battle,
        "initiative_order": list(gs.initiative_order),
        "current_turn_index": gs.current_turn_index,
        "awaiting_damage_roll": gs.awaiting_damage_roll,
        "solo_mode": gs.solo_mode,
        "recommended_players": gs.recommended_players,
        "campaign_dir": gs.campaign_dir,
        "loaded_section_keys": list((gs.loaded_sections or {}).keys()),
        "story_summary": gs.story_summary,
    }


def game_state_from_dict(data: dict[str, Any], *, base: GameState | None = None) -> GameState:
    """Hydrate a GameState from a durable snapshot."""
    gs = base or GameState()
    pc_data = data.get("pc")
    if pc_data:
        gs.pc = CharacterState.model_validate(pc_data)
    else:
        gs.pc = None

    enemies: dict[str, EnemyState] = {}
    for key, raw in (data.get("enemies") or {}).items():
        enemies[str(key)] = EnemyState.model_validate(raw)
    gs.enemies = enemies

    gs.npcs = {str(k): v for k, v in (data.get("npcs") or {}).items()}
    gs.campaign_title = str(data.get("campaign_title") or gs.campaign_title)
    gs.chapter = int(data.get("chapter") or gs.chapter or 1)
    gs.scene_label = str(data.get("scene_label") or gs.scene_label)
    gs.scene_label_before_combat = data.get("scene_label_before_combat")
    gs.time_current = int(
        data["time_current"] if data.get("time_current") is not None else gs.time_current
    )
    gs.time_max = int(data["time_max"] if data.get("time_max") is not None else gs.time_max)
    gs.countdowns = {
        str(k): int(v) for k, v in (data.get("countdowns") or {}).items()
    }
    gs.in_combat = bool(data.get("in_combat"))
    gs.is_boss_battle = bool(data.get("is_boss_battle"))
    gs.initiative_order = [str(x) for x in (data.get("initiative_order") or [])]
    gs.current_turn_index = int(data.get("current_turn_index") or 0)
    gs.awaiting_damage_roll = bool(data.get("awaiting_damage_roll"))
    gs.solo_mode = bool(data.get("solo_mode") if data.get("solo_mode") is not None else True)
    gs.recommended_players = int(
        data.get("recommended_players")
        if data.get("recommended_players") is not None
        else gs.recommended_players
    )
    if data.get("campaign_dir"):
        gs.campaign_dir = str(data["campaign_dir"])
    # loaded_sections content reloads from disk on demand; keep keys empty
    gs.loaded_sections = {}
    gs.story_summary = data.get("story_summary")
    return gs
