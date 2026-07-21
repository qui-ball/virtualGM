"""award_xp tool — XP grant without auto-level; allowed during combat."""

from types import SimpleNamespace

import pytest
from pydantic_ai import ModelRetry

from agent.tools import award_xp
from game.models import GameState, create_player_character, is_pending_level_up


def _ctx(gs: GameState):
    return SimpleNamespace(deps=gs)


def test_award_xp_increases_xp_without_changing_level():
    gs = GameState()
    gs.pc = create_player_character()
    gs.pc.xp = 90

    result = award_xp(_ctx(gs), 20, "defeated goblin")

    assert gs.pc.xp == 110
    assert gs.pc.level == 1
    assert is_pending_level_up(gs.pc.xp, gs.pc.level)
    assert "LEVEL UP" not in result


def test_award_xp_allowed_during_combat():
    gs = GameState()
    gs.pc = create_player_character()
    gs.in_combat = True

    award_xp(_ctx(gs), 50, "mid-fight bonus")

    assert gs.pc.xp == 50
    assert gs.pc.level == 1


def test_award_xp_rejects_non_positive_amount():
    gs = GameState()
    gs.pc = create_player_character()

    with pytest.raises(ModelRetry, match="positive"):
        award_xp(_ctx(gs), 0, "invalid")
