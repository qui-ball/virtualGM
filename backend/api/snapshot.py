"""Serialize GameState → API snapshot."""

from api.schemas import GameStateSnapshot
from game.models import GameState, XP_THRESHOLDS, is_pending_level_up
from game.session import Session


def game_state_snapshot(gs: GameState) -> GameStateSnapshot:
    pending_level_up = False
    if gs.pc is not None:
        pending_level_up = is_pending_level_up(gs.pc.xp, gs.pc.level)

    return GameStateSnapshot(
        character=gs.pc,
        enemies=gs.enemies,
        countdowns=gs.countdowns,
        in_combat=gs.in_combat,
        boss_encounter=gs.is_boss_battle,
        chapter=gs.chapter,
        scene_label=gs.scene_label,
        time_current=gs.time_current,
        time_max=gs.time_max,
        campaign_title=gs.campaign_title,
        pending_level_up=pending_level_up,
    )


def snapshot_dict(session: Session) -> dict:
    return game_state_snapshot(session.game_state).model_dump()
