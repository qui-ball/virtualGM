"""Session creation and solo mode."""

from fastapi.testclient import TestClient

from app import app
from game.solo_mode import (
    scale_enemy_count,
    solo_mode_instruction_block,
    solo_mode_rules_text,
)


client = TestClient(app)


def test_create_session_defaults_solo_mode_on():
    res = client.post("/sessions", json={})
    assert res.status_code == 200
    data = res.json()
    assert data["game_state"]["solo_mode"] is True


def test_create_session_solo_mode_off():
    res = client.post("/sessions", json={"solo_mode": False})
    assert res.status_code == 200
    assert res.json()["game_state"]["solo_mode"] is False


def test_create_session_solo_mode_on_explicit():
    res = client.post("/sessions", json={"solo_mode": True})
    assert res.status_code == 200
    assert res.json()["game_state"]["solo_mode"] is True


def test_campaign_list_includes_metadata():
    res = client.get("/campaigns")
    assert res.status_code == 200
    lost_mine = res.json()["campaigns"][0]
    assert lost_mine["id"] == "lost-mine"
    assert lost_mine["recommended_players"] == 4
    assert lost_mine["level_min"] == 1
    assert lost_mine["level_max"] == 5
    assert lost_mine["avg_level"] == 3
    assert lost_mine["solo_mode"] is True


def test_solo_mode_instruction_block_empty_when_disabled():
    assert solo_mode_instruction_block(False) == ""


def test_solo_mode_instruction_block_scales_by_party_size():
    block = solo_mode_instruction_block(True, recommended_players=4)
    assert "<solo_mode_rules>" in block
    assert "1/4" in block
    assert "25%" in block

    block3 = solo_mode_instruction_block(True, recommended_players=3)
    assert "1/3" in block3
    assert "33%" in block3


def test_scale_enemy_count_for_party_size():
    assert scale_enemy_count(4, 4) == 1
    assert scale_enemy_count(8, 4) == 2
    assert scale_enemy_count(3, 3) == 1
    assert scale_enemy_count(6, 3) == 2
    assert scale_enemy_count(4, 3) == 1
    assert scale_enemy_count(1, 4) == 1


def test_solo_mode_rules_examples_match_scaling():
    rules = solo_mode_rules_text(4)
    assert '"4 goblins" → 1 goblin' in rules
    assert '"6 enemies" → 2' in rules
