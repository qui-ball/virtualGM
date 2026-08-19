"""Qui roster fixtures: one inactive hero per end reason (dev seed / supabase merge).

Stable IDs match ``supabase/seed.sql``. Memory-mode tests do not load these.
"""

from __future__ import annotations

from typing import Any

QUI_OWNER_ID = "c0000002-0000-4000-8000-000000000001"
LM_TEMPLATE_ID = "a0000003-0000-4000-8000-000000000001"
TN_TEMPLATE_ID = "a0000003-0000-4000-8000-000000000002"

PT_FALLEN = "c0000003-0000-4000-8000-000000000001"
PT_COMPLETED = "c0000003-0000-4000-8000-000000000002"
PT_ENDED = "c0000003-0000-4000-8000-000000000003"
CHAR_FALLEN = "c0000004-0000-4000-8000-000000000001"
CHAR_COMPLETED = "c0000004-0000-4000-8000-000000000002"
CHAR_ENDED = "c0000004-0000-4000-8000-000000000003"

PREBUILT_KAEL = "a0000005-0000-4000-8000-000000000002"
PREBUILT_VESPERA = "a0000005-0000-4000-8000-000000000013"
PREBUILT_ALDRIC = "a0000005-0000-4000-8000-000000000001"


def _kael_fallen() -> dict[str, Any]:
    return {
        "name": "Kael Bramblefoot",
        "character_class": "ranger",
        "level": 2,
        "xp": 80,
        "stats": {"might": 0, "finesse": 2, "wit": 1, "presence": -1},
        "hp": 0,
        "hp_max": 10,
        "evasion": 13,
        "mana": None,
        "mana_max": None,
        "gold": 10,
        "conditions": [],
        "class_abilities": ["marksman"],
        "spells_known": [],
        "equipped_weapon": "Longbow",
        "equipped_armor": "Studded Leather",
        "inventory": [
            "Longbow",
            "Shortsword",
            "Arrows x24",
            "Hunter's Kit",
            "Explorer's Pack",
            "Waterskin",
            "Bedroll",
            "Rations x3",
            "Torch x2",
        ],
        "starting_package_id": "lm-ranger-trail-sniper",
        "ability_id": "RAN-S1",
    }


def _vespera_completed() -> dict[str, Any]:
    return {
        "name": "Vespera Greythorn",
        "character_class": "mage",
        "level": 3,
        "xp": 280,
        "stats": {"might": -1, "finesse": 0, "wit": 2, "presence": 1},
        "hp": 9,
        "hp_max": 9,
        "evasion": 10,
        "mana": 4,
        "mana_max": 7,
        "gold": 22,
        "conditions": [],
        "class_abilities": ["arcane_affinity"],
        "spells_known": ["Frost Ray", "Ray of Frost", "Shield", "Mage Hand"],
        "equipped_weapon": "Frost-rimed staff",
        "equipped_armor": None,
        "inventory": [
            "Frost-rimed staff",
            "Spellbook",
            "Ice crystal focus",
            "Dagger",
            "Explorer's Pack",
            "Waterskin",
            "Bedroll",
            "Rations x3",
            "Torch x2",
        ],
        "starting_package_id": "tn-mage-frost-elementalist",
        "ability_id": "MAG-S1",
    }


def _aldric_ended() -> dict[str, Any]:
    return {
        "name": "Aldric of Corlinn Hill",
        "character_class": "warrior",
        "level": 1,
        "xp": 15,
        "stats": {"might": 2, "finesse": 1, "wit": 0, "presence": -1},
        "hp": 12,
        "hp_max": 12,
        "evasion": 15,
        "mana": None,
        "mana_max": None,
        "gold": 10,
        "conditions": [],
        "class_abilities": ["armored_defense"],
        "spells_known": [],
        "equipped_weapon": "Longsword",
        "equipped_armor": "Chain Mail",
        "inventory": [
            "Longsword",
            "Shield",
            "Handaxe",
            "Rope",
            "Crowbar",
            "Explorer's Pack",
            "Waterskin",
            "Bedroll",
            "Rations x3",
            "Torch x2",
        ],
        "starting_package_id": "lm-warrior-wagon-guard",
        "ability_id": "WAR-S3",
    }


def _character_row(
    *,
    cid: str,
    pc: dict[str, Any],
    gender: str,
    race_id: str,
    template_id: str,
    prebuilt_id: str,
    created_at: str,
) -> dict[str, Any]:
    return {
        "id": cid,
        "owner_id": QUI_OWNER_ID,
        "pc": pc,
        "meta": {
            "gender": gender,
            "race_id": race_id,
            "campaign_template_id": template_id,
            "cloned_from_prebuilt_id": prebuilt_id,
            "starting_package_id": pc.get("starting_package_id"),
            "source": "prebuilt",
            "name": pc["name"],
            "class_id": pc["character_class"],
            "level": pc["level"],
            "owner_id": QUI_OWNER_ID,
        },
        "created_at": created_at,
    }


def _playthrough_row(
    *,
    pid: str,
    cid: str,
    pc: dict[str, Any],
    gender: str,
    slug: str,
    template_id: str,
    campaign_name: str,
    chapter: int,
    time_current: int,
    time_max: int,
    last_scene: str,
    level_min: int,
    level_max: int,
    avg_level: int,
    recommended_players: int,
    end_reason: str,
    created_at: str,
) -> dict[str, Any]:
    return {
        "id": pid,
        "owner_id": QUI_OWNER_ID,
        "campaign_template_slug": slug,
        "campaign_template_id": template_id,
        "campaign_name": campaign_name,
        "character_id": cid,
        "character_name": pc["name"],
        "character_class": pc["character_class"],
        "level": pc["level"],
        "xp": pc["xp"],
        "gender": gender,
        "solo_mode": True,
        "session_id": None,
        "chapter": chapter,
        "time_current": time_current,
        "time_max": time_max,
        "last_scene": last_scene,
        "level_min": level_min,
        "level_max": level_max,
        "avg_level": avg_level,
        "recommended_players": recommended_players,
        "completed": True,
        "end_reason": end_reason,
        "created_at": created_at,
        "pc_snapshot": pc,
        "game_state": None,
    }


def qui_demo_blob() -> dict[str, Any]:
    """Characters + completed playthroughs for Qui's inactive roster."""
    kael = _kael_fallen()
    vespera = _vespera_completed()
    aldric = _aldric_ended()
    return {
        "characters": {
            CHAR_FALLEN: _character_row(
                cid=CHAR_FALLEN,
                pc=kael,
                gender="male",
                race_id="elf",
                template_id=LM_TEMPLATE_ID,
                prebuilt_id=PREBUILT_KAEL,
                created_at="2026-02-10T12:00:00+00:00",
            ),
            CHAR_COMPLETED: _character_row(
                cid=CHAR_COMPLETED,
                pc=vespera,
                gender="female",
                race_id="human",
                template_id=TN_TEMPLATE_ID,
                prebuilt_id=PREBUILT_VESPERA,
                created_at="2026-03-20T12:00:00+00:00",
            ),
            CHAR_ENDED: _character_row(
                cid=CHAR_ENDED,
                pc=aldric,
                gender="male",
                race_id="human",
                template_id=LM_TEMPLATE_ID,
                prebuilt_id=PREBUILT_ALDRIC,
                created_at="2026-04-05T12:00:00+00:00",
            ),
        },
        "playthroughs": {
            PT_FALLEN: _playthrough_row(
                pid=PT_FALLEN,
                cid=CHAR_FALLEN,
                pc=kael,
                gender="male",
                slug="fantasy-lost-mine",
                template_id=LM_TEMPLATE_ID,
                campaign_name="Lost Mine of Phandelver",
                chapter=2,
                time_current=18,
                time_max=50,
                last_scene="Klarg's cave",
                level_min=1,
                level_max=5,
                avg_level=3,
                recommended_players=4,
                end_reason="fallen",
                created_at="2026-02-10T12:00:00+00:00",
            ),
            PT_COMPLETED: _playthrough_row(
                pid=PT_COMPLETED,
                cid=CHAR_COMPLETED,
                pc=vespera,
                gender="female",
                slug="fantasy-touch-of-the-necromancer",
                template_id=TN_TEMPLATE_ID,
                campaign_name="Touch of the Necromancer",
                chapter=5,
                time_current=4,
                time_max=35,
                last_scene="The ritual holds",
                level_min=1,
                level_max=3,
                avg_level=2,
                recommended_players=1,
                end_reason="completed",
                created_at="2026-03-20T12:00:00+00:00",
            ),
            PT_ENDED: _playthrough_row(
                pid=PT_ENDED,
                cid=CHAR_ENDED,
                pc=aldric,
                gender="male",
                slug="fantasy-lost-mine",
                template_id=LM_TEMPLATE_ID,
                campaign_name="Lost Mine of Phandelver",
                chapter=1,
                time_current=42,
                time_max=50,
                last_scene="Goblin ambush on the Triboar Trail",
                level_min=1,
                level_max=5,
                avg_level=3,
                recommended_players=4,
                end_reason="ended",
                created_at="2026-04-05T12:00:00+00:00",
            ),
        },
        "incomplete_solo": {},
    }


def qui_demo_blob_for_owner(owner_id: str) -> dict[str, Any]:
    """Demo blob owned by ``owner_id`` (live Qui may differ from the seed UUID)."""
    blob = qui_demo_blob()
    if owner_id == QUI_OWNER_ID:
        return blob
    characters = {}
    for cid, row in blob["characters"].items():
        meta = dict(row.get("meta") or {})
        meta["owner_id"] = owner_id
        characters[cid] = {**row, "owner_id": owner_id, "meta": meta}
    playthroughs = {
        pid: {**row, "owner_id": owner_id}
        for pid, row in blob["playthroughs"].items()
    }
    return {
        "characters": characters,
        "playthroughs": playthroughs,
        "incomplete_solo": {},
    }


def merge_qui_demo(blob: dict[str, Any], owner_id: str = QUI_OWNER_ID) -> bool:
    """Insert missing Qui demo rows. Returns True if anything was added."""
    demo = qui_demo_blob_for_owner(owner_id)
    added = False
    characters = blob.setdefault("characters", {})
    playthroughs = blob.setdefault("playthroughs", {})
    for cid, row in demo["characters"].items():
        if cid not in characters:
            characters[cid] = row
            added = True
    for pid, row in demo["playthroughs"].items():
        if pid not in playthroughs:
            playthroughs[pid] = row
            added = True
    return added
