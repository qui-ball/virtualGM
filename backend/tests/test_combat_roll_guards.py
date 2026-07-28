"""Combat roll sequencing and scene restoration."""

from types import SimpleNamespace

import pytest
from pydantic_ai import ModelRetry

from agent.tools import apply_damage, narrate
from api.combat_roll_guards import (
    is_attack_pending_action,
    note_roll_result_resolution,
    roll_result_agent_suffix,
)
from api.schemas import PendingAction, RollResultPayload
from game.combat_lifecycle import finish_combat, start_combat_state
from game.models import EnemyState, GameState, create_player_character


def _ctx(gs: GameState):
    # tool_call_id is always present on a real RunContext; narrate() uses it to correlate
    # its settle/discard signal with the deltas the client streamed.
    return SimpleNamespace(deps=gs, tool_call_id="t1")


def _attack_pending() -> PendingAction:
    return PendingAction(
        action_type="ask_player_roll",
        dice_count=1,
        dice_type="d20",
        purpose="Longsword attack vs Goblin A",
        tool_call_id="t1",
        vs_label="vs Eva 12",
        dc=12,
    )


def _hit_payload() -> RollResultPayload:
    return RollResultPayload(
        label="Longsword attack",
        nat=15,
        die_a=15,
        total=17,
        modifier=2,
        pass_=True,
        vs=12,
        dc=12,
        vs_label="vs Eva 12",
    )


def test_attack_hit_sets_awaiting_damage_flag():
    gs = GameState()
    note_roll_result_resolution(gs, _attack_pending(), _hit_payload())
    assert gs.awaiting_damage_roll is True
    assert "ask_player_roll" in roll_result_agent_suffix(gs)


def test_attack_miss_clears_awaiting_damage():
    gs = GameState()
    gs.awaiting_damage_roll = True
    payload = _hit_payload().model_copy(update={"pass_": False})
    note_roll_result_resolution(gs, _attack_pending(), payload)
    assert gs.awaiting_damage_roll is False


def test_narrate_blocked_while_awaiting_damage():
    gs = GameState()
    gs.awaiting_damage_roll = True
    with pytest.raises(ModelRetry, match="damage"):
        narrate(_ctx(gs), "The goblin crumples and dies.")


def test_end_combat_restores_scene_label():
    gs = GameState()
    gs.scene_label = "Cragmaw Hideout"
    start_combat_state(gs, ["Aldric"])
    gs.scene_label = "Combat — Goblin Ambush"

    finish_combat(gs, reason="victory")

    assert gs.in_combat is False
    assert gs.scene_label == "Cragmaw Hideout"


def test_pc_defeat_in_non_boss_combat_ends_combat():
    gs = GameState()
    gs.pc = create_player_character()
    gs.pc.hp = 3
    start_combat_state(gs, ["Aldric", "Goblin B"])
    gs.scene_label = "Combat — Cave den"
    gs.enemies["Goblin B"] = EnemyState(
        name="Goblin B", hp=5, hp_max=5, evasion=12
    )

    apply_damage(_ctx(gs), "pc", 5)

    assert gs.pc.hp == 0
    assert gs.in_combat is False
    assert "Goblin B" in gs.enemies


def test_is_attack_pending_action():
    assert is_attack_pending_action(_attack_pending()) is True
    skill = PendingAction(
        action_type="ask_player_roll",
        dice_count=1,
        dice_type="d20",
        purpose="Wit check",
        tool_call_id="t2",
        dc=8,
        vs_label="DC 8",
    )
    assert is_attack_pending_action(skill) is False
