"""WS-6 integration matrix: both templates × paths, solo guard, multi-instance lobby."""

from pathlib import Path

from fastapi.testclient import TestClient

from app import app
from game.session import store as session_store

client = TestClient(app)

LM = "fantasy-lost-mine"
TN = "fantasy-touch-of-the-necromancer"
LM_ID = "a0000003-0000-4000-8000-000000000001"
TN_ID = "a0000003-0000-4000-8000-000000000002"

LM_PREBUILTS = (
    ("a0000005-0000-4000-8000-000000000001", "Aldric of Corlinn Hill", "Elara of Corlinn Hill"),
    ("a0000005-0000-4000-8000-000000000002", "Kael Bramblefoot", "Mira Bramblefoot"),
    ("a0000005-0000-4000-8000-000000000003", "Silas Emberquill", "Lyra Emberquill"),
    ("a0000005-0000-4000-8000-000000000004", "Finn Harpsong", "Wren Harpsong"),
)
TN_PREBUILTS = (
    ("a0000005-0000-4000-8000-000000000011", "Rowan Ashford", "Rena Ashford"),
    ("a0000005-0000-4000-8000-000000000012", "Lir Venn", "Lira Venn"),
    ("a0000005-0000-4000-8000-000000000013", "Alden Greythorn", "Vespera Greythorn"),
    ("a0000005-0000-4000-8000-000000000014", "Calen Marsh", "Callia Marsh"),
)

LM_CONTENT = "LostMineOfPhandelverAdapted"
TN_CONTENT = "TouchOfTheNecromancerAdapted"


def _start_prebuilt(slug: str, prebuilt: str, gender: str, *, solo: bool = False, replace: bool = False):
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
    return client.post("/active-campaigns", json=body)


def _start_inline(
    slug: str,
    template_id: str,
    *,
    name: str,
    class_id: str,
    package_id: str,
    race_id: str = "human",
    gender: str = "female",
    solo: bool = False,
):
    return client.post(
        "/active-campaigns",
        json={
            "campaign_template_slug": slug,
            "solo_mode": solo,
            "character": {
                "source": "inline",
                "payload": {
                    "campaign_template_id": template_id,
                    "name": name,
                    "gender": gender,
                    "class_id": class_id,
                    "race_id": race_id,
                    "stats": {"might": 2, "finesse": 1, "wit": 0, "presence": -1}
                    if class_id == "warrior"
                    else {"might": -1, "finesse": 0, "wit": 2, "presence": 1},
                    "starting_package_id": package_id,
                },
            },
        },
    )


def _assert_session_content(session_id: str, content_dir: str, title: str):
    session = session_store.get(session_id)
    assert session is not None
    gs = session.game_state
    assert content_dir in (gs.campaign_dir or "")
    assert Path(gs.campaign_dir, "index.md").is_file()
    assert gs.campaign_title == title
    assert gs.in_combat is False
    assert gs.pc is not None


# --- Matrix: Lost Mine prebuilt × 4 classes × gender ---


def test_ws6_lost_mine_prebuilt_all_classes_genders():
    for prebuilt, male, female in LM_PREBUILTS:
        for gender, expected in (("male", male), ("female", female)):
            res = _start_prebuilt(LM, prebuilt, gender)
            assert res.status_code == 200, res.text
            body = res.json()
            assert body["character_name"] == expected
            _assert_session_content(
                body["session_id"], LM_CONTENT, "Lost Mine of Phandelver"
            )


# --- Matrix: Lost Mine create wizard Package A/B ---


def test_ws6_lost_mine_create_package_a_and_b():
    for package_id, expected_weapon in (
        ("lm-warrior-wagon-guard", "Longsword"),
        ("lm-warrior-goblin-slayer", "Greataxe"),
    ):
        res = _start_inline(
            LM,
            LM_ID,
            name=f"Guard {package_id}",
            class_id="warrior",
            package_id=package_id,
        )
        assert res.status_code == 200, res.text
        body = res.json()
        assert body["character_name"].startswith("Guard")
        session = session_store.get(body["session_id"])
        assert session is not None
        assert session.game_state.pc.equipped_weapon == expected_weapon
        _assert_session_content(
            body["session_id"], LM_CONTENT, "Lost Mine of Phandelver"
        )


# --- Matrix: Necromancer prebuilt × create ---


def test_ws6_necromancer_prebuilt_all_classes_genders():
    for prebuilt, male, female in TN_PREBUILTS:
        for gender, expected in (("male", male), ("female", female)):
            res = _start_prebuilt(TN, prebuilt, gender)
            assert res.status_code == 200, res.text
            body = res.json()
            assert body["character_name"] == expected
            _assert_session_content(
                body["session_id"], TN_CONTENT, "Touch of the Necromancer"
            )


def test_ws6_necromancer_create_wizard():
    res = _start_inline(
        TN,
        TN_ID,
        name="Nyx Frost",
        class_id="mage",
        package_id="tn-mage-frost-elementalist",
        race_id="elf",
    )
    assert res.status_code == 200, res.text
    body = res.json()
    assert body["character_name"] == "Nyx Frost"
    session = session_store.get(body["session_id"])
    assert session is not None
    assert "Frost Ray" in session.game_state.pc.spells_known
    _assert_session_content(
        body["session_id"], TN_CONTENT, "Touch of the Necromancer"
    )


# --- Matrix: Solo replace / continue ---


def test_ws6_solo_continue_then_replace_warned_path():
    first = _start_prebuilt(LM, LM_PREBUILTS[0][0], "male", solo=True)
    assert first.status_code == 200
    existing_id = first.json()["active_campaign_id"]
    old_session = first.json()["session_id"]

    # Different template solo is fine
    other = _start_prebuilt(TN, TN_PREBUILTS[2][0], "female", solo=True)
    assert other.status_code == 200

    # Same template solo conflicts
    conflict = _start_prebuilt(LM, LM_PREBUILTS[1][0], "female", solo=True)
    assert conflict.status_code == 409
    detail = conflict.json()["detail"]
    assert detail["code"] == "solo_conflict"
    assert "continue" in detail["continue_path"]
    assert detail["existing_campaign_id"] == existing_id
    assert detail["campaign_template_slug"] == LM

    cont = client.post(detail["continue_path"])
    assert cont.status_code == 200
    assert cont.json()["active_campaign_id"] == existing_id

    replaced = _start_prebuilt(
        LM, LM_PREBUILTS[1][0], "female", solo=True, replace=True
    )
    assert replaced.status_code == 200
    assert session_store.get(old_session) is None
    lobby = client.get("/campaigns").json()["campaigns"]
    assert len(lobby) == 2
    lm = next(c for c in lobby if c["campaign_template_slug"] == LM)
    assert lm["character_name"] == "Mira Bramblefoot"


# --- Matrix: Second non-solo instance — both in lobby ---


def test_ws6_multiple_non_solo_instances_in_lobby():
    a = _start_prebuilt(LM, LM_PREBUILTS[0][0], "male", solo=False)
    b = _start_prebuilt(TN, TN_PREBUILTS[0][0], "female", solo=False)
    assert a.status_code == 200
    assert b.status_code == 200
    lobby = client.get("/campaigns").json()["campaigns"]
    ids = {c["id"] for c in lobby}
    assert a.json()["active_campaign_id"] in ids
    assert b.json()["active_campaign_id"] in ids
    assert len(lobby) == 2


# --- Regression: resume after save ---


def test_ws6_resume_after_save():
    start = _start_prebuilt(LM, LM_PREBUILTS[0][0], "male", solo=False)
    assert start.status_code == 200
    playthrough_id = start.json()["active_campaign_id"]
    session_id = start.json()["session_id"]

    session = session_store.get(session_id)
    assert session is not None
    session.game_state.chapter = 2
    session.game_state.scene_label = "Phandalin"
    session.game_state.time_current = 30

    saved = client.post(f"/active-campaigns/{playthrough_id}/save")
    assert saved.status_code == 200

    session_store.delete(session_id)
    cont = client.post(f"/active-campaigns/{playthrough_id}/continue")
    assert cont.status_code == 200
    assert cont.json()["session_id"] != session_id
    assert cont.json()["game_state"]["chapter"] == 2
    assert cont.json()["game_state"]["scene_label"] == "Phandalin"
    assert cont.json()["game_state"]["in_combat"] is False
