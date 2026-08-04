"""Build CharacterState from prebuilt clone or wizard draft."""

from __future__ import annotations

from typing import Any, Literal

from catalog.service import (
    ability_code_to_engine_id,
    get_package,
    get_prebuilt,
    get_template_by_id,
    get_template_by_slug,
)
from game.models import CharacterState, SpellDefinition, Stats

Gender = Literal["male", "female"]


def portrait_placeholder_key(class_id: str, gender: Gender) -> str:
    return f"{class_id}-{gender}"


def resolve_prebuilt_name(prebuilt: dict[str, Any], gender: Gender) -> str:
    if gender == "female":
        return str(prebuilt["name_female"])
    return str(prebuilt["name_male"])


def character_from_prebuilt(
    prebuilt_id: str, gender: Gender
) -> tuple[CharacterState, dict[str, Any]]:
    """Clone a prebuilt into a playable CharacterState + metadata."""
    prebuilt = get_prebuilt(prebuilt_id)
    if prebuilt is None:
        raise ValueError(f"Unknown prebuilt_character_id: {prebuilt_id}")
    name = resolve_prebuilt_name(prebuilt, gender)
    data = dict(prebuilt.get("character_data") or {})
    pc = _character_from_sheet(
        name=name,
        class_id=prebuilt["class_id"],
        level=int(prebuilt.get("level") or 1),
        sheet=data,
        ability_id=prebuilt.get("starting_ability_id"),
    )
    meta = {
        "gender": gender,
        "race_id": prebuilt.get("race_id"),
        "campaign_template_id": prebuilt.get("campaign_template_id"),
        "cloned_from_prebuilt_id": prebuilt_id,
        "starting_package_id": data.get("starting_package_id")
        or prebuilt.get("default_package_id"),
        "source": "prebuilt",
    }
    return pc, meta


def character_from_draft(draft: dict[str, Any]) -> tuple[CharacterState, dict[str, Any]]:
    """Build CharacterState from wizard CreateCharacterDraft."""
    name = str(draft.get("name") or "").strip()
    if not name:
        raise ValueError("Character name is required")

    validate_stats_array(draft.get("stats") or {})

    package_id = draft["starting_package_id"]
    package = get_package(package_id)
    if package is None:
        raise ValueError(f"Unknown starting_package_id: {package_id}")

    class_id = draft["class_id"]
    if package["class_id"] != class_id:
        raise ValueError(
            f"Package {package_id} is for {package['class_id']}, not {class_id}"
        )

    template_id = draft.get("campaign_template_id")
    if template_id and package["campaign_template_id"] != template_id:
        raise ValueError("Package does not belong to campaign_template_id")

    race_id = draft.get("race_id")
    if race_id not in RACE_IDS:
        raise ValueError(
            f"Invalid race_id: {race_id}. Expected one of {sorted(RACE_IDS)}"
        )

    pkg_data = dict(package.get("package_data") or {})
    stats = draft.get("stats") or {}
    ability_id = package.get("ability_id")
    engine_ability = ability_code_to_engine_id(str(ability_id)) if ability_id else None

    spells = draft.get("spells_known")
    if spells is None:
        spells = list(pkg_data.get("spells_known") or [])

    sheet = {
        "stats": {
            "might": int(stats["might"]),
            "finesse": int(stats["finesse"]),
            "wit": int(stats["wit"]),
            "presence": int(stats["presence"]),
        },
        "hp": draft.get("hp"),
        "hp_max": draft.get("hp_max"),
        "evasion": draft.get("evasion"),
        "mana": draft.get("mana"),
        "mana_max": draft.get("mana_max"),
        "xp": 0,
        "gold": int(pkg_data.get("gold", 10)),
        "conditions": [],
        "class_abilities": [engine_ability] if engine_ability else [],
        "spells_known": list(spells),
        "equipped_weapon": pkg_data.get("equipped_weapon"),
        "equipped_armor": pkg_data.get("equipped_armor"),
        "inventory": list(pkg_data.get("inventory") or []),
        "starting_package_id": package_id,
        "ability_id": ability_id,
        "armor_evasion_bonus": pkg_data.get("armor_evasion_bonus", 0),
        "shield_evasion_bonus": pkg_data.get("shield_evasion_bonus", 0),
    }

    sheet = _fill_derived_combat_stats(class_id, sheet)

    # FR-6.2.3: starting level = template level_min (defaults to 1 when the
    # draft has no campaign context, e.g. a standalone POST /characters call).
    resolved_template_id = template_id or package["campaign_template_id"]
    template = get_template_by_id(resolved_template_id) if resolved_template_id else None
    level = int(template.get("level_min") or 1) if template else 1

    pc = _character_from_sheet(
        name=name,
        class_id=class_id,
        level=level,
        sheet=sheet,
        ability_id=ability_id,
    )
    meta = {
        "gender": draft["gender"],
        "race_id": race_id,
        "campaign_template_id": template_id or package["campaign_template_id"],
        "cloned_from_prebuilt_id": None,
        "starting_package_id": package_id,
        "source": "created",
    }
    return pc, meta


RACE_IDS = frozenset({"human", "elf", "half-orc", "dragonborn"})
STAT_ARRAY = frozenset({2, 1, 0, -1})


def validate_stats_array(stats: dict[str, Any]) -> None:
    """POC ruleset: assign modifiers +2, +1, 0, −1 once each."""
    values = [
        int(stats.get("might", 99)),
        int(stats.get("finesse", 99)),
        int(stats.get("wit", 99)),
        int(stats.get("presence", 99)),
    ]
    if frozenset(values) != STAT_ARRAY or len(values) != 4:
        raise ValueError(
            "stats must be a permutation of +2, +1, 0, -1 "
            "(might, finesse, wit, presence)"
        )


def list_races() -> list[dict[str, str]]:
    return [
        {"id": "human", "name": "Human"},
        {"id": "elf", "name": "Elf"},
        {"id": "half-orc", "name": "Half-orc"},
        {"id": "dragonborn", "name": "Dragonborn"},
    ]


def apply_template_to_game_state(gs: Any, template: dict[str, Any], campaigns_root: Any) -> None:
    """Set campaign title, opening scene, time, and content path on GameState."""
    from pathlib import Path

    content_path = template["content_path"]
    campaign_dir = Path(campaigns_root) / content_path
    if not campaign_dir.is_dir():
        raise ValueError(f"Campaign content missing: {campaign_dir}")

    gs.campaign_title = template["name"]
    gs.chapter = int(template.get("opening_chapter") or 1)
    gs.scene_label = str(template.get("opening_scene") or "Opening")
    gs.time_current = int(
        template.get("opening_time_current")
        if template.get("opening_time_current") is not None
        else template.get("time_max") or 50
    )
    gs.time_max = int(template.get("time_max") or 50)
    gs.recommended_players = int(template.get("recommended_players") or 4)
    gs.campaign_dir = str(campaign_dir)


def resolve_template_slug(slug: str) -> dict[str, Any]:
    template = get_template_by_slug(slug)
    if template is None:
        raise ValueError(f"Unknown campaign_template_slug: {slug}")
    return template


def _fill_derived_combat_stats(class_id: str, sheet: dict[str, Any]) -> dict[str, Any]:
    stats = sheet["stats"]
    might = int(stats["might"])
    finesse = int(stats["finesse"])
    wit = int(stats["wit"])

    hit_die = {"warrior": 10, "mage": 6, "ranger": 8, "bard": 8}.get(class_id, 8)
    if sheet.get("hp_max") is None:
        sheet["hp_max"] = hit_die + might
    if sheet.get("hp") is None:
        sheet["hp"] = sheet["hp_max"]

    armor_b = int(sheet.get("armor_evasion_bonus") or 0)
    shield_b = int(sheet.get("shield_evasion_bonus") or 0)
    if sheet.get("evasion") is None:
        sheet["evasion"] = 10 + finesse + armor_b + shield_b

    if class_id in ("mage", "bard"):
        if sheet.get("mana_max") is None:
            # Match prebuilt baselines: mage 7 (wit 2), bard 6 (presence 2) approx
            base = 5 + max(wit, int(stats.get("presence", 0)))
            sheet["mana_max"] = base
        if sheet.get("mana") is None:
            sheet["mana"] = sheet["mana_max"]
    else:
        sheet["mana"] = None
        sheet["mana_max"] = None

    return sheet


def _character_from_sheet(
    *,
    name: str,
    class_id: str,
    level: int,
    sheet: dict[str, Any],
    ability_id: str | None,
) -> CharacterState:
    stats_raw = sheet.get("stats") or {}
    stats = Stats(
        might=int(stats_raw.get("might", 0)),
        finesse=int(stats_raw.get("finesse", 0)),
        wit=int(stats_raw.get("wit", 0)),
        presence=int(stats_raw.get("presence", 0)),
    )

    abilities = list(sheet.get("class_abilities") or [])
    if not abilities and ability_id:
        abilities = [ability_code_to_engine_id(str(ability_id))]

    spells_known = list(sheet.get("spells_known") or [])
    spells = [
        SpellDefinition(id=_spell_id(s), name=s, tier="Minor", mp_cost=1)
        for s in spells_known
    ]

    return CharacterState(
        name=name,
        character_class=class_id,  # type: ignore[arg-type]
        level=level,
        xp=int(sheet.get("xp") or 0),
        stats=stats,
        hp=int(sheet["hp"]),
        hp_max=int(sheet["hp_max"]),
        evasion=int(sheet["evasion"]),
        mana=sheet.get("mana"),
        mana_max=sheet.get("mana_max"),
        conditions=list(sheet.get("conditions") or []),
        class_abilities=abilities,
        spells_known=spells_known,
        spells=spells,
        gold=int(sheet.get("gold") or 10),
        inventory=list(sheet.get("inventory") or []),
        equipped_weapon=sheet.get("equipped_weapon"),
        equipped_armor=sheet.get("equipped_armor"),
    )


def _spell_id(name: str) -> str:
    return name.lower().replace(" ", "_").replace("'", "")
