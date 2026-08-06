"""Durable playthrough persistence (Feature 07 multi-account).

Preferred: Supabase via service role (all soft-account owners).
Fallback: JSON file under ``backend/data/`` when Supabase is unavailable.
"""

from __future__ import annotations

import json
import os
from pathlib import Path
from typing import Any

from loguru import logger

from supabase_client import get_supabase_service_client, is_supabase_configured

RULESET_ID = "a0000001-0000-4000-8000-000000000001"

# Legacy alias — Prefer Qui if present (seed Feature 07).
QUI_USER_ID = "c0000002-0000-4000-8000-000000000001"
POC_AUTH_USER_ID = "b0000001-0000-4000-8000-000000000001"  # deprecated

DATA_DIR = Path(__file__).resolve().parent.parent / "data"
FILE_STORE_PATH = DATA_DIR / "playthroughs.json"


def persistence_mode() -> str:
    """memory | file | supabase — tests default to memory."""
    mode = os.getenv("VIRTUALGM_PLAYTHROUGH_STORE", "").strip().lower()
    if mode in {"memory", "file", "supabase"}:
        return mode
    if os.getenv("VIRTUALGM_USE_STATIC_CATALOG", "").strip().lower() in {
        "1",
        "true",
        "yes",
    }:
        return "memory"
    if is_supabase_configured():
        return "supabase"
    return "file"


def load_all() -> dict[str, Any]:
    """Load durable blob: {characters, playthroughs, incomplete_solo}."""
    mode = persistence_mode()
    if mode == "memory":
        return _empty_blob()
    if mode == "supabase":
        try:
            return _load_from_supabase()
        except Exception as exc:  # noqa: BLE001
            logger.warning(f"Supabase playthrough load failed, trying file: {exc}")
            return _load_from_file()
    return _load_from_file()


def save_all(blob: dict[str, Any]) -> None:
    mode = persistence_mode()
    if mode == "memory":
        return
    if mode == "supabase":
        try:
            _save_to_supabase(blob)
            _save_to_file(blob)
            return
        except Exception as exc:  # noqa: BLE001
            logger.warning(f"Supabase playthrough save failed, using file: {exc}")
            _save_to_file(blob)
            return
    _save_to_file(blob)


def resolve_poc_owner_id() -> str | None:
    """Deprecated: returns Qui soft-account id when present (compat)."""
    if not is_supabase_configured():
        return QUI_USER_ID
    try:
        client = get_supabase_service_client()
        res = (
            client.table("users")
            .select("id")
            .eq("id", QUI_USER_ID)
            .limit(1)
            .execute()
        )
        if res.data:
            return str(res.data[0]["id"])
    except Exception as exc:  # noqa: BLE001
        logger.warning(f"Qui owner lookup failed: {exc}")
    return QUI_USER_ID


def _empty_blob() -> dict[str, Any]:
    return {"characters": {}, "playthroughs": {}, "incomplete_solo": {}}


def _load_from_file() -> dict[str, Any]:
    if not FILE_STORE_PATH.is_file():
        return _empty_blob()
    try:
        data = json.loads(FILE_STORE_PATH.read_text(encoding="utf-8"))
        if not isinstance(data, dict):
            return _empty_blob()
        data.setdefault("characters", {})
        data.setdefault("playthroughs", {})
        data.setdefault("incomplete_solo", {})
        return data
    except Exception as exc:  # noqa: BLE001
        logger.warning(f"Failed reading {FILE_STORE_PATH}: {exc}")
        return _empty_blob()


def _save_to_file(blob: dict[str, Any]) -> None:
    DATA_DIR.mkdir(parents=True, exist_ok=True)
    tmp = FILE_STORE_PATH.with_suffix(".tmp")
    tmp.write_text(json.dumps(blob, indent=2, default=str), encoding="utf-8")
    tmp.replace(FILE_STORE_PATH)


def _playthrough_from_camp_row(row: dict[str, Any]) -> dict[str, Any]:
    state = row.get("campaign_state") or {}
    pid = str(row["id"])
    return {
        "id": pid,
        "owner_id": str(row["owner_id"]),
        "campaign_template_slug": state.get("campaign_template_slug"),
        "campaign_template_id": str(row["campaign_template_id"]),
        "campaign_name": state.get("campaign_name") or "",
        "character_id": state.get("character_id"),
        "character_name": state.get("character_name") or "",
        "character_class": state.get("character_class") or "",
        "level": int(state.get("level") or 1),
        "xp": int(state.get("xp") or 0),
        "gender": state.get("gender") or "male",
        "solo_mode": bool(row.get("solo_mode")),
        "session_id": state.get("runtime_session_id"),
        "chapter": int(state.get("chapter") or 1),
        "time_current": int(state.get("time_current") or 0),
        "time_max": int(state.get("time_max") or 50),
        "last_scene": state.get("last_scene") or "",
        "level_min": int(state.get("level_min") or 1),
        "level_max": int(state.get("level_max") or 5),
        "avg_level": state.get("avg_level"),
        "recommended_players": int(state.get("recommended_players") or 4),
        "completed": bool(row.get("is_completed")),
        "created_at": row.get("created_at") or row.get("started_at"),
        "pc_snapshot": state.get("pc_snapshot"),
        "game_state": state.get("game_state"),
    }


def _load_from_supabase() -> dict[str, Any]:
    """Load incomplete playthroughs + characters for all soft accounts."""
    client = get_supabase_service_client()
    camps = (
        client.table("active_campaigns")
        .select(
            "id,owner_id,campaign_template_id,solo_mode,is_completed,campaign_state,"
            "started_at,last_played_at,created_at"
        )
        .eq("is_completed", False)
        .order("last_played_at", desc=True)
        .execute()
    )
    chars = (
        client.table("characters")
        .select(
            "id,user_id,name,level,class_id,race_id,gender,character_data,"
            "campaign_template_id,cloned_from_prebuilt_id,starting_package_id,"
            "active_campaign_id,created_at"
        )
        .execute()
    )

    blob = _empty_blob()
    for row in chars.data or []:
        cid = str(row["id"])
        blob["characters"][cid] = {
            "id": cid,
            "owner_id": str(row.get("user_id") or ""),
            "pc": row.get("character_data") or {},
            "meta": {
                "gender": row.get("gender"),
                "race_id": row.get("race_id"),
                "campaign_template_id": row.get("campaign_template_id"),
                "cloned_from_prebuilt_id": row.get("cloned_from_prebuilt_id"),
                "starting_package_id": row.get("starting_package_id"),
                "source": "prebuilt" if row.get("cloned_from_prebuilt_id") else "created",
                "name": row.get("name"),
                "class_id": row.get("class_id"),
                "level": row.get("level"),
                "owner_id": str(row.get("user_id") or ""),
            },
            "created_at": row.get("created_at"),
        }

    incomplete_solo: dict[str, dict[str, str]] = {}
    for row in camps.data or []:
        pid = str(row["id"])
        owner_id = str(row["owner_id"])
        prow = _playthrough_from_camp_row(row)
        blob["playthroughs"][pid] = prow
        if row.get("solo_mode") and not row.get("is_completed"):
            slug = (row.get("campaign_state") or {}).get("campaign_template_slug")
            if slug:
                incomplete_solo.setdefault(owner_id, {})[str(slug)] = pid

    blob["incomplete_solo"] = incomplete_solo
    return blob


def _save_to_supabase(blob: dict[str, Any]) -> None:
    """Upsert all playthroughs/characters keyed by each row's owner_id."""
    client = get_supabase_service_client()

    existing_camps = client.table("active_campaigns").select("id").execute()
    existing_ids = {str(r["id"]) for r in (existing_camps.data or [])}
    desired_ids = set(blob.get("playthroughs", {}).keys())

    for old_id in existing_ids - desired_ids:
        client.table("active_campaigns").delete().eq("id", old_id).execute()

    for cid, crow in (blob.get("characters") or {}).items():
        meta = crow.get("meta") or {}
        pc = crow.get("pc") or {}
        owner_id = (
            crow.get("owner_id")
            or meta.get("owner_id")
            or QUI_USER_ID
        )
        name = pc.get("name") or meta.get("name") or "Adventurer"
        row = {
            "id": cid,
            "user_id": owner_id,
            "ruleset_id": RULESET_ID,
            "name": name,
            "level": int(pc.get("level") or meta.get("level") or 1),
            "class_id": pc.get("character_class") or meta.get("class_id"),
            "race_id": meta.get("race_id"),
            "gender": meta.get("gender") or "male",
            "character_data": pc,
            "campaign_template_id": meta.get("campaign_template_id"),
            "cloned_from_prebuilt_id": meta.get("cloned_from_prebuilt_id"),
            "starting_package_id": meta.get("starting_package_id"),
        }
        client.table("characters").upsert(row).execute()

    for pid, pt in (blob.get("playthroughs") or {}).items():
        owner_id = pt.get("owner_id") or QUI_USER_ID
        state = {
            "campaign_template_slug": pt.get("campaign_template_slug"),
            "campaign_name": pt.get("campaign_name"),
            "character_id": pt.get("character_id"),
            "character_name": pt.get("character_name"),
            "character_class": pt.get("character_class"),
            "level": pt.get("level"),
            "xp": pt.get("xp"),
            "gender": pt.get("gender"),
            "runtime_session_id": pt.get("session_id"),
            "chapter": pt.get("chapter"),
            "time_current": pt.get("time_current"),
            "time_max": pt.get("time_max"),
            "last_scene": pt.get("last_scene"),
            "level_min": pt.get("level_min"),
            "level_max": pt.get("level_max"),
            "avg_level": pt.get("avg_level"),
            "recommended_players": pt.get("recommended_players"),
            "pc_snapshot": pt.get("pc_snapshot"),
            "game_state": pt.get("game_state"),
        }
        row = {
            "id": pid,
            "owner_id": owner_id,
            "campaign_template_id": pt["campaign_template_id"],
            "ruleset_id": RULESET_ID,
            "solo_mode": bool(pt.get("solo_mode")),
            "is_completed": bool(pt.get("completed")),
            "campaign_state": state,
        }
        client.table("active_campaigns").upsert(row).execute()
        char_id = pt.get("character_id")
        if char_id:
            client.table("characters").update(
                {"active_campaign_id": pid}
            ).eq("id", char_id).execute()

    existing_chars = client.table("characters").select("id").execute()
    desired_chars = set(blob.get("characters", {}).keys())
    for row in existing_chars.data or []:
        cid = str(row["id"])
        if cid not in desired_chars:
            client.table("characters").delete().eq("id", cid).execute()
