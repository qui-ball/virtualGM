"""Dice roll resolution for player actions."""

from api.dice import resolve_d20_from_rolls, resolve_dice_from_rolls
from api.enrichment import build_pending_action
from api.roll_result import build_roll_result_payload
from api.schemas import ActionResponse
from game.models import GameState, create_player_character


def test_resolve_dice_from_rolls_sums_damage():
    rolled = resolve_dice_from_rolls([4], dice_count=1, dice_type="d8", modifier=2)
    assert rolled["total"] == 6
    assert rolled["rolls"] == [4]
    assert rolled["crit"] is False


def test_resolve_d20_from_rolls_keeps_crit():
    rolled = resolve_d20_from_rolls([20], modifier=2, vs=15)
    assert rolled["nat"] == 20
    assert rolled["crit"] is True
    assert rolled["total"] == 22


def test_build_roll_result_payload_for_damage():
    gs = GameState()
    gs.pc = create_player_character()
    pending = build_pending_action(
        "ask_player_roll",
        "tool-1",
        {
            "dice_count": 1,
            "dice_type": "d6",
            "purpose": "Longsword damage",
            "modifier": 2,
        },
        gs,
    )
    payload = build_roll_result_payload(
        pending,
        ActionResponse(roll_result=5, individual_rolls=[5]),
    )
    assert payload.dice_type == "d6"
    assert payload.total == 7
    assert payload.rolls == [5]
    assert payload.crit is False
    assert payload.dc is None


def test_build_pending_action_skips_dc_for_damage():
    gs = GameState()
    gs.pc = create_player_character()
    pending = build_pending_action(
        "ask_player_roll",
        "tool-2",
        {
            "dice_count": 2,
            "dice_type": "d6",
            "purpose": "Greatsword damage",
        },
        gs,
    )
    assert pending.dice_type == "d6"
    assert pending.dc is None
    assert pending.vs_label is None
    assert pending.footer is None
