"""Combat lifecycle — start/end, initiative, auto-exit, rest gating."""

import asyncio
from types import SimpleNamespace

import pytest
from pydantic_ai import ModelRetry

from agent.tools import end_combat, remove_enemy, start_combat
from api.session_actions import apply_long_rest, apply_short_rest
from api.snapshot import game_state_snapshot
from game.combat_lifecycle import (
    finish_combat,
    maybe_end_combat_when_encounter_cleared,
    start_combat_state,
)
from game.models import EnemyState, GameState, create_player_character
from game.session import Session


def _ctx(gs: GameState):
    return SimpleNamespace(deps=gs)


def test_start_combat_sets_state_and_emits_event():
    gs = GameState()
    gs.pc = create_player_character()
    queue: asyncio.Queue = asyncio.Queue()
    gs._event_queue = queue

    start_combat_state(gs, ["Aldric", "Goblin 1"])
    from game.combat_lifecycle import emit_combat_start

    emit_combat_start(gs, gs.initiative_order)

    event_type, payload = queue.get_nowait()
    assert event_type == "combat_start"
    assert payload["initiative_order"] == ["Aldric", "Goblin 1"]
    assert payload["game_state"]["in_combat"] is True
    assert payload["game_state"]["initiative_order"] == ["Aldric", "Goblin 1"]


def test_start_combat_tool_rejects_when_already_active():
    gs = GameState()
    gs.pc = create_player_character()
    gs.in_combat = True

    with pytest.raises(ModelRetry, match="already active"):
        start_combat(_ctx(gs), ["Aldric"])


def test_end_combat_clears_initiative():
    gs = GameState()
    gs.pc = create_player_character()
    gs.scene_label = "Forest trail"
    start_combat_state(gs, ["Aldric", "Gob 1"])
    gs.scene_label = "Combat — Ambush"

    assert finish_combat(gs, reason="fled") is True
    assert gs.in_combat is False
    assert gs.initiative_order == []
    assert gs.current_turn_index == 0
    assert gs.scene_label == "Forest trail"


def test_maybe_end_combat_when_last_enemy_removed():
    gs = GameState()
    gs.pc = create_player_character()
    start_combat_state(gs, ["Aldric"])
    gs.enemies["g1"] = EnemyState(
        name="Goblin 1", hp=1, hp_max=6, evasion=12
    )
    queue: asyncio.Queue = asyncio.Queue()
    gs._event_queue = queue

    remove_enemy(_ctx(gs), "g1")

    assert gs.in_combat is False
    assert gs.enemies == {}
    event_type, _payload = queue.get_nowait()
    assert event_type == "combat_end"


def test_end_combat_tool_is_noop_when_not_active():
    gs = GameState()
    gs.pc = create_player_character()

    assert end_combat(_ctx(gs), "test") == "Combat was not active."


def test_snapshot_exposes_initiative_fields():
    gs = GameState()
    gs.pc = create_player_character()
    start_combat_state(gs, ["A", "B"])
    gs.current_turn_index = 1

    snap = game_state_snapshot(gs)
    assert snap.initiative_order == ["A", "B"]
    assert snap.current_turn_index == 1


def test_rest_blocked_during_combat():
    gs = GameState()
    gs.pc = create_player_character()
    gs.in_combat = True

    with pytest.raises(ValueError, match="Cannot rest"):
        apply_short_rest(gs)
    with pytest.raises(ValueError, match="Cannot rest"):
        apply_long_rest(gs)


def test_combat_transcript_appended_when_session_linked():
    session = Session()
    session.game_state.pc = create_player_character()
    gs = session.game_state
    gs._session = session
    start_combat_state(gs, ["Aldric", "Goblin 1"])
    from game.combat_lifecycle import emit_combat_start, finish_combat

    emit_combat_start(gs, gs.initiative_order)
    finish_combat(gs, reason="victory")

    kinds = [e.kind for e in session.transcript]
    assert kinds == ["combat_start", "combat_end"]


def test_maybe_end_combat_noop_when_enemies_remain():
    gs = GameState()
    start_combat_state(gs, ["A"])
    gs.enemies["g1"] = EnemyState(name="G1", hp=5, hp_max=5, evasion=10)
    assert maybe_end_combat_when_encounter_cleared(gs) is False
    assert gs.in_combat is True


def test_remove_enemy_updates_initiative_while_combat_active():
    from game.combat_lifecycle import remove_from_initiative

    gs = GameState()
    gs.pc = create_player_character()
    start_combat_state(gs, ["Aldric", "Goblin 1", "Goblin 2"])
    gs.enemies["Goblin 1"] = EnemyState(name="Goblin 1", hp=1, hp_max=6, evasion=12)
    gs.enemies["Goblin 2"] = EnemyState(name="Goblin 2", hp=1, hp_max=6, evasion=12)
    gs.current_turn_index = 1

    remove_from_initiative(gs, "Goblin 1")

    assert gs.initiative_order == ["Aldric", "Goblin 2"]
    assert gs.current_turn_index == 0
    assert gs.in_combat is True


def test_create_enemy_appends_to_initiative_during_combat():
    from game.combat_lifecycle import add_to_initiative

    gs = GameState()
    start_combat_state(gs, ["Aldric", "Goblin 1"])
    assert add_to_initiative(gs, "Goblin 2") is True
    assert gs.initiative_order == ["Aldric", "Goblin 1", "Goblin 2"]


def test_apply_damage_at_zero_hp_removes_from_initiative():
    from agent.tools import apply_damage

    gs = GameState()
    gs.pc = create_player_character()
    start_combat_state(gs, ["Aldric", "Goblin 1", "Goblin 2"])
    gs.enemies["Goblin 1"] = EnemyState(name="Goblin 1", hp=4, hp_max=6, evasion=12)
    gs.enemies["Goblin 2"] = EnemyState(name="Goblin 2", hp=6, hp_max=6, evasion=12)
    gs.current_turn_index = 1

    apply_damage(_ctx(gs), "Goblin 1", 4)

    assert gs.initiative_order == ["Aldric", "Goblin 2"]
    assert gs.current_turn_index == 0
    assert "Goblin 1" in gs.enemies
