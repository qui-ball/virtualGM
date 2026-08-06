"""Feature 07: soft accounts, GameState snapshot resume, transcript archive."""

from __future__ import annotations

import json
from unittest.mock import patch

from fastapi.testclient import TestClient

from api.accounts import SEEDED_ACCOUNTS, reset_memory_accounts_for_tests
from app import app
from catalog import transcript_archive as transcript_arch
from catalog.playthrough_store import playthrough_store
from game.models import EnemyState
from game.session import store as session_store
from game.state_codec import game_state_from_dict, game_state_to_dict

client = TestClient(app)

QUI = SEEDED_ACCOUNTS[0]["id"]
BILUN = SEEDED_ACCOUNTS[1]["id"]
LM_WARRIOR = "a0000005-0000-4000-8000-000000000001"


def _headers(account_id: str) -> dict[str, str]:
    return {"X-Account-Id": account_id}


def _start(account_id: str, *, replace: bool = False):
    body = {
        "campaign_template_slug": "fantasy-lost-mine",
        "solo_mode": True,
        "character": {
            "source": "prebuilt",
            "prebuilt_character_id": LM_WARRIOR,
            "gender": "male",
        },
    }
    if replace:
        body["replace_existing_solo"] = True
    return client.post(
        "/active-campaigns",
        json=body,
        headers=_headers(account_id),
    )


def test_list_seeded_accounts():
    reset_memory_accounts_for_tests()
    res = client.get("/accounts")
    assert res.status_code == 200
    names = {a["display_name"] for a in res.json()["accounts"]}
    assert "Qui" in names
    assert "Bilun" in names


def test_create_account_rejects_duplicate():
    reset_memory_accounts_for_tests()
    res = client.post("/accounts", json={"display_name": "Qui"})
    assert res.status_code == 409


def test_create_account_persists_in_memory():
    reset_memory_accounts_for_tests()
    res = client.post("/accounts", json={"display_name": "Alex"})
    assert res.status_code == 200
    aid = res.json()["id"]
    listed = client.get("/accounts").json()["accounts"]
    assert any(a["id"] == aid and a["display_name"] == "Alex" for a in listed)


def test_campaigns_require_account_header():
    res = client.get("/campaigns")
    assert res.status_code == 401


def test_qui_bilun_lobby_isolation():
    playthrough_store.clear()
    reset_memory_accounts_for_tests()

    qui_start = _start(QUI)
    assert qui_start.status_code == 200
    qui_id = qui_start.json()["active_campaign_id"]

    bilun_lobby = client.get("/campaigns", headers=_headers(BILUN))
    assert bilun_lobby.status_code == 200
    assert bilun_lobby.json()["campaigns"] == []

    qui_lobby = client.get("/campaigns", headers=_headers(QUI))
    assert len(qui_lobby.json()["campaigns"]) == 1
    assert qui_lobby.json()["campaigns"][0]["id"] == qui_id

    bilun_start = _start(BILUN)
    assert bilun_start.status_code == 200
    assert bilun_start.json()["active_campaign_id"] != qui_id

    assert len(client.get("/campaigns", headers=_headers(QUI)).json()["campaigns"]) == 1
    assert len(client.get("/campaigns", headers=_headers(BILUN)).json()["campaigns"]) == 1


def test_continue_rejects_other_account():
    playthrough_store.clear()
    reset_memory_accounts_for_tests()
    started = _start(QUI)
    pid = started.json()["active_campaign_id"]
    res = client.post(
        f"/active-campaigns/{pid}/continue",
        headers=_headers(BILUN),
    )
    assert res.status_code == 404


def test_mid_combat_snapshot_resume():
    playthrough_store.clear()
    reset_memory_accounts_for_tests()
    started = _start(QUI)
    body = started.json()
    pid = body["active_campaign_id"]
    sid = body["session_id"]
    session = session_store.get(sid)
    assert session is not None
    gs = session.game_state
    gs.in_combat = True
    gs.initiative_order = ["pc", "goblin"]
    gs.current_turn_index = 1
    gs.enemies = {
        "goblin": EnemyState(
            name="Goblin",
            hp=7,
            hp_max=7,
            evasion=15,
            attack_modifier=4,
            damage="1d6+2",
        )
    }
    gs.pc.hp = 9
    gs.scene_label = "Goblin Ambush"
    gs.chapter = 1

    save = client.post(
        f"/active-campaigns/{pid}/save",
        headers=_headers(QUI),
    )
    assert save.status_code == 200

    session_store.delete(sid)
    assert session_store.get(sid) is None

    cont = client.post(
        f"/active-campaigns/{pid}/continue",
        headers=_headers(QUI),
    )
    assert cont.status_code == 200
    data = cont.json()
    assert data["session_id"] != sid
    snap = data["game_state"]
    assert snap["in_combat"] is True
    assert snap["initiative_order"] == ["pc", "goblin"]
    assert snap["current_turn_index"] == 1
    assert "goblin" in snap["enemies"]
    assert snap["character"]["hp"] == 9
    assert snap["scene_label"] == "Goblin Ambush"


def test_state_codec_roundtrip_includes_npcs():
    from game.models import CharacterState, GameState

    gs = GameState()
    gs.pc = CharacterState(
        name="Aldric",
        character_class="warrior",
        hp=20,
        hp_max=20,
        evasion=12,
    )
    gs.npcs = {"sildar": {"name": "Sildar", "role": "ally"}}
    blob = game_state_to_dict(gs)
    restored = game_state_from_dict(blob)
    assert restored.npcs["sildar"]["name"] == "Sildar"


def test_transcript_archive_compacts_over_threshold(tmp_path, monkeypatch):
    monkeypatch.setenv("VIRTUALGM_PLAYTHROUGH_STORE", "memory")
    monkeypatch.setattr(transcript_arch, "TRANSCRIPT_RAW_MAX_ENTRIES", 6)
    monkeypatch.setattr(transcript_arch, "TRANSCRIPT_RAW_MAX_BYTES", 10_000)
    monkeypatch.setattr(transcript_arch, "DATA_DIR", tmp_path)

    entries = [
        {
            "id": f"e{i}",
            "kind": "message",
            "role": "gm",
            "content": f"Narration line {i} " + ("x" * 40),
            "timestamp": float(i),
        }
        for i in range(12)
    ]
    archive = transcript_arch.replace_live_transcript("pt-test", entries)
    assert len(archive["summaries"]) >= 1
    assert len(archive["entries"]) < 12
    assert "Earlier in the adventure" in archive["summaries"][0]["summary_text"]


def test_transcript_summarize_failure_keeps_raw(tmp_path, monkeypatch):
    monkeypatch.setattr(transcript_arch, "TRANSCRIPT_RAW_MAX_ENTRIES", 4)
    monkeypatch.setattr(transcript_arch, "TRANSCRIPT_RAW_MAX_BYTES", 10_000)
    monkeypatch.setattr(transcript_arch, "DATA_DIR", tmp_path)

    entries = [
        {
            "id": f"e{i}",
            "kind": "message",
            "role": "gm",
            "content": f"Line {i}",
            "timestamp": float(i),
        }
        for i in range(10)
    ]
    with patch.object(
        transcript_arch,
        "_summarize_entries",
        side_effect=RuntimeError("llm down"),
    ):
        archive = transcript_arch.replace_live_transcript("pt-fail", entries)
    assert archive["summaries"] == []
    assert len(archive["entries"]) == 10


def test_continue_returns_transcript_archive():
    playthrough_store.clear()
    reset_memory_accounts_for_tests()
    started = _start(QUI)
    assert started.status_code == 200
    data = started.json()
    assert "transcript_archive" in data
    pid = data["active_campaign_id"]
    cont = client.post(
        f"/active-campaigns/{pid}/continue",
        headers=_headers(QUI),
    )
    assert cont.status_code == 200
    arch = cont.json().get("transcript_archive")
    assert arch is not None
    assert "summaries" in arch
    assert "entries" in arch


def test_session_state_rejects_other_account():
    playthrough_store.clear()
    reset_memory_accounts_for_tests()
    started = _start(QUI)
    sid = started.json()["session_id"]
    ok = client.get(f"/sessions/{sid}/state", headers=_headers(QUI))
    assert ok.status_code == 200
    denied = client.get(f"/sessions/{sid}/state", headers=_headers(BILUN))
    assert denied.status_code == 404
    missing = client.get(f"/sessions/{sid}/state")
    assert missing.status_code == 401


def test_cannot_attach_other_accounts_character():
    playthrough_store.clear()
    reset_memory_accounts_for_tests()
    created = client.post(
        "/characters",
        headers=_headers(QUI),
        json={
            "source": "prebuilt",
            "prebuilt_character_id": LM_WARRIOR,
            "gender": "male",
        },
    )
    assert created.status_code == 200
    cid = created.json()["character_id"]
    stolen = client.post(
        "/active-campaigns",
        headers=_headers(BILUN),
        json={
            "campaign_template_slug": "fantasy-lost-mine",
            "solo_mode": False,
            "character": {"source": "created", "character_id": cid},
        },
    )
    assert stolen.status_code == 400
