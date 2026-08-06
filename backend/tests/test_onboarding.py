"""WS-2 onboarding: catalog, character clone, start/continue/save, solo conflict."""

from pathlib import Path

from fastapi.testclient import TestClient

from app import app
from catalog.playthrough_store import playthrough_store
from game.session import store as session_store
from tests.conftest import ACCOUNT_HEADERS

client = TestClient(app)

LM_WARRIOR = "a0000005-0000-4000-8000-000000000001"
LM_RANGER = "a0000005-0000-4000-8000-000000000002"
LM_MAGE = "a0000005-0000-4000-8000-000000000003"
LM_BARD = "a0000005-0000-4000-8000-000000000004"
TN_MAGE = "a0000005-0000-4000-8000-000000000013"
TN_CONTENT = "TouchOfTheNecromancerAdapted"


def _start(slug: str, prebuilt: str, gender: str, *, solo: bool = True, replace: bool = False):
    body = {
        "campaign_template_slug": slug,
        "solo_mode": solo,
        "character": {
            "source": "prebuilt",
            "prebuilt_character_id": prebuilt,
            "gender": gender,
        },
    }
    if replace:
        body["replace_existing_solo"] = True
    return client.post("/active-campaigns", json=body, headers=ACCOUNT_HEADERS)


def test_list_campaign_templates():
    res = client.get("/campaign-templates")
    assert res.status_code == 200
    slugs = {t["slug"] for t in res.json()["templates"]}
    assert "fantasy-lost-mine" in slugs
    assert "fantasy-touch-of-the-necromancer" in slugs
    lost = next(t for t in res.json()["templates"] if t["slug"] == "fantasy-lost-mine")
    assert lost["content_path"]  # kept for debugging


def test_list_races():
    res = client.get("/races")
    assert res.status_code == 200
    ids = {r["id"] for r in res.json()["races"]}
    assert ids == {"human", "elf", "half-orc", "dragonborn"}


def test_list_prebuilts_lost_mine():
    res = client.get("/campaign-templates/fantasy-lost-mine/prebuilt-characters")
    assert res.status_code == 200
    prebuilts = res.json()["prebuilts"]
    assert len(prebuilts) == 4
    warrior = next(p for p in prebuilts if p["class_id"] == "warrior")
    assert warrior["portrait_placeholder_key_male"] == "warrior-male"
    assert warrior["portrait_placeholder_key_female"] == "warrior-female"


def test_list_packages_filtered_by_class():
    res = client.get(
        "/campaign-templates/fantasy-touch-of-the-necromancer/starting-packages",
        params={"class_id": "mage"},
    )
    assert res.status_code == 200
    labels = {p["label"] for p in res.json()["packages"]}
    assert "Frost Elementalist" in labels


def test_clone_prebuilt_female_name():
    res = client.post(
        "/characters",
        headers=ACCOUNT_HEADERS,
        json={
            "source": "prebuilt",
            "prebuilt_character_id": LM_WARRIOR,
            "gender": "female",
        },
    )
    assert res.status_code == 200
    assert res.json()["name"] == "Elara of Corlinn Hill"


def test_create_character_rejects_bad_stats_and_empty_name():
    bad_stats = client.post(
        "/characters",
        headers=ACCOUNT_HEADERS,
        json={
            "source": "created",
            "payload": {
                "campaign_template_id": "a0000003-0000-4000-8000-000000000002",
                "name": "Nyx",
                "gender": "female",
                "class_id": "mage",
                "race_id": "elf",
                "stats": {"might": 2, "finesse": 2, "wit": 0, "presence": -1},
                "starting_package_id": "tn-mage-frost-elementalist",
            },
        },
    )
    assert bad_stats.status_code == 400

    empty_name = client.post(
        "/characters",
        headers=ACCOUNT_HEADERS,
        json={
            "source": "created",
            "payload": {
                "campaign_template_id": "a0000003-0000-4000-8000-000000000002",
                "name": "   ",
                "gender": "female",
                "class_id": "mage",
                "race_id": "elf",
                "stats": {"might": 2, "finesse": 1, "wit": 0, "presence": -1},
                "starting_package_id": "tn-mage-frost-elementalist",
            },
        },
    )
    assert empty_name.status_code == 400


def test_create_character_from_wizard_draft():
    res = client.post(
        "/characters",
        headers=ACCOUNT_HEADERS,
        json={
            "source": "created",
            "payload": {
                "campaign_template_id": "a0000003-0000-4000-8000-000000000002",
                "name": "Nyx Frost",
                "gender": "female",
                "class_id": "mage",
                "race_id": "elf",
                "stats": {"might": -1, "finesse": 0, "wit": 2, "presence": 1},
                "starting_package_id": "tn-mage-frost-elementalist",
            },
        },
    )
    assert res.status_code == 200
    assert "Frost Ray" in res.json()["character"]["spells_known"]


def test_prebuilt_all_classes_both_genders_lost_mine():
    for prebuilt, male, female in (
        (LM_WARRIOR, "Aldric of Corlinn Hill", "Elara of Corlinn Hill"),
        (LM_RANGER, "Kael Bramblefoot", "Mira Bramblefoot"),
        (LM_MAGE, "Silas Emberquill", "Lyra Emberquill"),
        (LM_BARD, "Finn Harpsong", "Wren Harpsong"),
    ):
        for gender, expected in (("male", male), ("female", female)):
            res = _start("fantasy-lost-mine", prebuilt, gender, solo=False)
            assert res.status_code == 200, res.text
            assert res.json()["character_name"] == expected


def test_start_and_lobby_and_continue_and_save():
    start = _start("fantasy-lost-mine", LM_WARRIOR, "male", solo=True)
    assert start.status_code == 200
    body = start.json()
    playthrough_id = body["active_campaign_id"]
    session_id = body["session_id"]

    lobby = client.get("/campaigns", headers=ACCOUNT_HEADERS).json()["campaigns"]
    assert len(lobby) == 1
    assert lobby[0]["id"] == playthrough_id
    assert lobby[0]["character_name"] == body["character_name"]
    assert lobby[0]["hp"] >= 1
    assert lobby[0]["hp_max"] >= lobby[0]["hp"]
    assert "xp" in lobby[0]
    assert "evasion" in lobby[0]

    # Mutate live session then save
    session = session_store.get(session_id)
    assert session is not None
    session.game_state.chapter = 2
    session.game_state.scene_label = "Cragmaw Cave"
    session.game_state.time_current = 40

    saved = client.post(f"/active-campaigns/{playthrough_id}/save", headers=ACCOUNT_HEADERS)
    assert saved.status_code == 200
    assert saved.json()["chapter"] == 2
    assert saved.json()["last_scene"] == "Cragmaw Cave"

    # Continue reuses live session
    cont = client.post(f"/active-campaigns/{playthrough_id}/continue", headers=ACCOUNT_HEADERS)
    assert cont.status_code == 200
    assert cont.json()["session_id"] == session_id
    assert cont.json()["game_state"]["chapter"] == 2

    # Drop live session — continue recreates from snapshot
    session_store.delete(session_id)
    cont2 = client.post(f"/active-campaigns/{playthrough_id}/continue", headers=ACCOUNT_HEADERS)
    assert cont2.status_code == 200
    assert cont2.json()["session_id"] != session_id
    assert cont2.json()["game_state"]["chapter"] == 2
    assert cont2.json()["game_state"]["scene_label"] == "Cragmaw Cave"


def test_start_necromancer_loads_content_path():
    start = _start(
        "fantasy-touch-of-the-necromancer", TN_MAGE, "female", solo=False
    )
    assert start.status_code == 200
    body = start.json()
    assert body["character_name"] == "Vespera Greythorn"
    assert body["game_state"]["campaign_title"] == "Touch of the Necromancer"
    session = session_store.get(body["session_id"])
    assert session is not None
    assert TN_CONTENT in (session.game_state.campaign_dir or "")
    assert Path(session.game_state.campaign_dir, "index.md").is_file()


def test_solo_conflict_same_template_only_allows_continue_or_replace():
    first = _start("fantasy-lost-mine", LM_WARRIOR, "male", solo=True)
    assert first.status_code == 200
    existing_id = first.json()["active_campaign_id"]
    old_session = first.json()["session_id"]

    # Different campaign in solo is allowed
    other = _start(
        "fantasy-touch-of-the-necromancer", TN_MAGE, "male", solo=True
    )
    assert other.status_code == 200, other.text

    # Same campaign template in solo conflicts
    conflict = _start("fantasy-lost-mine", LM_RANGER, "female", solo=True)
    assert conflict.status_code == 409
    detail = conflict.json()["detail"]
    assert detail["code"] == "solo_conflict"
    assert detail["existing_campaign_id"] == existing_id
    assert detail["campaign_template_slug"] == "fantasy-lost-mine"
    assert detail["continue_path"].endswith(f"/{existing_id}/continue")

    # Continue existing instead of replacing
    cont = client.post(detail["continue_path"], headers=ACCOUNT_HEADERS)
    assert cont.status_code == 200
    assert cont.json()["active_campaign_id"] == existing_id

    replaced = _start(
        "fantasy-lost-mine",
        LM_RANGER,
        "female",
        solo=True,
        replace=True,
    )
    assert replaced.status_code == 200
    assert session_store.get(old_session) is None
    lobby = client.get("/campaigns", headers=ACCOUNT_HEADERS).json()["campaigns"]
    slugs = {c["campaign_template_slug"] for c in lobby}
    assert "fantasy-lost-mine" in slugs
    assert "fantasy-touch-of-the-necromancer" in slugs
    lm = next(c for c in lobby if c["campaign_template_slug"] == "fantasy-lost-mine")
    assert lm["character_name"] == "Mira Bramblefoot"


def test_multiple_different_templates_solo_allowed():
    a = _start("fantasy-lost-mine", LM_WARRIOR, "male", solo=True)
    b = _start("fantasy-touch-of-the-necromancer", TN_MAGE, "female", solo=True)
    assert a.status_code == 200
    assert b.status_code == 200
    lobby = client.get("/campaigns", headers=ACCOUNT_HEADERS).json()["campaigns"]
    assert len(lobby) == 2
    assert {c["campaign_template_slug"] for c in lobby} == {
        "fantasy-lost-mine",
        "fantasy-touch-of-the-necromancer",
    }


def test_created_character_wrong_template_rejected():
    created = client.post(
        "/characters",
        headers=ACCOUNT_HEADERS,
        json={
            "source": "created",
            "payload": {
                "campaign_template_id": "a0000003-0000-4000-8000-000000000001",
                "name": "Wrong Bind",
                "gender": "male",
                "class_id": "warrior",
                "race_id": "human",
                "stats": {"might": 2, "finesse": 1, "wit": 0, "presence": -1},
                "starting_package_id": "lm-warrior-wagon-guard",
            },
        },
    )
    assert created.status_code == 200
    cid = created.json()["character_id"]
    bad = client.post(
        "/active-campaigns",
        headers=ACCOUNT_HEADERS,
        json={
            "campaign_template_slug": "fantasy-touch-of-the-necromancer",
            "solo_mode": False,
            "character": {"source": "created", "character_id": cid},
        },
    )
    assert bad.status_code == 400


def test_session_with_template_enforces_solo_conflict():
    first = _start("fantasy-lost-mine", LM_WARRIOR, "male", solo=True)
    assert first.status_code == 200
    res = client.post(
        "/sessions",
        headers=ACCOUNT_HEADERS,
        json={
            "campaign_template_slug": "fantasy-lost-mine",
            "prebuilt_character_id": LM_RANGER,
            "gender": "male",
            "solo_mode": True,
        },
    )
    assert res.status_code == 409


def test_multiple_non_solo_playthroughs_allowed():
    for slug, prebuilt, gender in (
        ("fantasy-lost-mine", LM_WARRIOR, "male"),
        ("fantasy-lost-mine", LM_WARRIOR, "female"),
        ("fantasy-touch-of-the-necromancer", TN_MAGE, "male"),
    ):
        res = _start(slug, prebuilt, gender, solo=False)
        assert res.status_code == 200, res.text
    assert len(client.get("/campaigns", headers=ACCOUNT_HEADERS).json()["campaigns"]) == 3


def test_abandon_playthrough_removes_from_lobby():
    start = _start("fantasy-lost-mine", LM_WARRIOR, "male", solo=False)
    assert start.status_code == 200
    pid = start.json()["active_campaign_id"]
    sid = start.json()["session_id"]
    assert len(client.get("/campaigns", headers=ACCOUNT_HEADERS).json()["campaigns"]) == 1

    gone = client.delete(f"/active-campaigns/{pid}", headers=ACCOUNT_HEADERS)
    assert gone.status_code == 200
    assert client.get("/campaigns", headers=ACCOUNT_HEADERS).json()["campaigns"] == []
    assert session_store.get(sid) is None


def test_file_persistence_survives_store_rehydrate(tmp_path, monkeypatch):
    monkeypatch.setenv("VIRTUALGM_PLAYTHROUGH_STORE", "file")
    from catalog import persistence as persist

    monkeypatch.setattr(persist, "FILE_STORE_PATH", tmp_path / "playthroughs.json")
    monkeypatch.setattr(persist, "DATA_DIR", tmp_path)

    playthrough_store.clear()
    playthrough_store._hydrated = False  # noqa: SLF001

    start = _start("fantasy-lost-mine", LM_WARRIOR, "male", solo=False)
    assert start.status_code == 200
    pid = start.json()["active_campaign_id"]
    assert (tmp_path / "playthroughs.json").is_file()

    # Simulate process restart
    playthrough_store._characters.clear()  # noqa: SLF001
    playthrough_store._playthroughs.clear()  # noqa: SLF001
    playthrough_store._incomplete_solo.clear()  # noqa: SLF001
    playthrough_store._hydrated = False  # noqa: SLF001

    lobby = client.get("/campaigns", headers=ACCOUNT_HEADERS).json()["campaigns"]
    assert len(lobby) == 1
    assert lobby[0]["id"] == pid
