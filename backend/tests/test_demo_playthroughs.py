"""Qui inactive roster fixtures stay valid CharacterState snapshots."""

from catalog.demo_playthroughs import (
    QUI_OWNER_ID,
    merge_qui_demo,
    qui_demo_blob,
)
from catalog.playthrough_store import playthrough_store
from game.models import CharacterState
from tests.conftest import ACCOUNT_HEADERS, QUI_ACCOUNT_ID

from fastapi.testclient import TestClient

from app import app

client = TestClient(app)


def test_qui_demo_sheets_validate_and_merge_is_idempotent():
    blob = qui_demo_blob()
    reasons = {pt["end_reason"] for pt in blob["playthroughs"].values()}
    assert reasons == {"fallen", "completed", "ended"}
    for row in blob["characters"].values():
        CharacterState.model_validate(row["pc"])
    empty = {"characters": {}, "playthroughs": {}, "incomplete_solo": {}}
    assert merge_qui_demo(empty) is True
    assert merge_qui_demo(empty) is False
    remapped = {"characters": {}, "playthroughs": {}, "incomplete_solo": {}}
    live = "01cc42b8-554f-47cf-8126-4a373d3eb6ad"
    assert merge_qui_demo(remapped, owner_id=live) is True
    assert all(row["owner_id"] == live for row in remapped["playthroughs"].values())


def test_qui_demo_hydrates_as_inactive_lobby_rows(monkeypatch):
    from catalog import persistence as persist

    monkeypatch.setattr(persist, "load_all", qui_demo_blob)
    playthrough_store._hydrated = False  # noqa: SLF001
    rows = playthrough_store.list_playthroughs(QUI_OWNER_ID)
    assert {p.end_reason for p in rows} == {"fallen", "completed", "ended"}
    assert all(p.completed for p in rows)
    lobby = client.get("/campaigns", headers=ACCOUNT_HEADERS).json()["campaigns"]
    by_name = {row["character_name"]: row for row in lobby}
    assert by_name["Kael Bramblefoot"]["end_reason"] == "fallen"
    assert by_name["Kael Bramblefoot"]["hp"] == 0
    assert by_name["Vespera Greythorn"]["end_reason"] == "completed"
    assert by_name["Aldric of Corlinn Hill"]["end_reason"] == "ended"
    assert QUI_ACCOUNT_ID == QUI_OWNER_ID
