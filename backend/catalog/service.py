"""Campaign catalog: static seed mirror + optional Supabase read."""

from __future__ import annotations

import os
from typing import Any

from loguru import logger

from catalog import static_catalog as static
from supabase_client import get_supabase_service_client, is_supabase_configured


def _prefer_static_catalog() -> bool:
    """Tests / offline: skip Supabase catalog reads when explicitly requested."""
    return os.getenv("VIRTUALGM_USE_STATIC_CATALOG", "").strip().lower() in {
        "1",
        "true",
        "yes",
    }


def list_templates() -> list[dict[str, Any]]:
    """Return campaign template summaries (slug, genre, levels, cover)."""
    if not _prefer_static_catalog():
        rows = _fetch_templates_from_supabase()
        if rows is not None:
            return [_merge_with_static(t) for t in rows]
    return [dict(t) for t in static.TEMPLATES]


def get_template_by_slug(slug: str) -> dict[str, Any] | None:
    for t in list_templates():
        if t["slug"] == slug:
            return t
    return None


def get_template_by_id(template_id: str) -> dict[str, Any] | None:
    for t in list_templates():
        if t["id"] == template_id:
            return t
    return None


def _merge_with_static(row: dict[str, Any]) -> dict[str, Any]:
    """Overlay DB row on static metadata (recommended_players, openings, etc.)."""
    static_match = next(
        (
            s
            for s in static.TEMPLATES
            if s.get("slug") == row.get("slug") or s.get("id") == row.get("id")
        ),
        None,
    )
    if not static_match:
        return dict(row)
    merged = dict(static_match)
    merged.update({k: v for k, v in row.items() if v is not None})
    return merged


def list_prebuilts_for_slug(slug: str) -> list[dict[str, Any]] | None:
    """Prebuilts for a template slug, or None if slug unknown."""
    template = get_template_by_slug(slug)
    if template is None:
        return None
    template_id = template["id"]
    if not _prefer_static_catalog():
        rows = _fetch_prebuilts_from_supabase(template_id)
        if rows is not None:
            return rows
    return [dict(p) for p in static.PREBUILTS if p["campaign_template_id"] == template_id]


def get_prebuilt(prebuilt_id: str) -> dict[str, Any] | None:
    if not _prefer_static_catalog():
        rows = _fetch_prebuilt_by_id(prebuilt_id)
        if rows is not None:
            return rows
    for p in static.PREBUILTS:
        if p["id"] == prebuilt_id:
            return dict(p)
    return None


def list_packages_for_slug(
    slug: str, class_id: str | None = None
) -> list[dict[str, Any]] | None:
    template = get_template_by_slug(slug)
    if template is None:
        return None
    template_id = template["id"]
    if not _prefer_static_catalog():
        rows = _fetch_packages_from_supabase(template_id, class_id)
        if rows is not None:
            return rows
    out = [
        dict(pkg)
        for pkg in static.PACKAGES.values()
        if pkg["campaign_template_id"] == template_id
        and (class_id is None or pkg["class_id"] == class_id)
    ]
    out.sort(key=lambda p: (p["class_id"], p["sort_order"]))
    return out


def get_package(package_id: str) -> dict[str, Any] | None:
    if not _prefer_static_catalog():
        rows = _fetch_package_by_id(package_id)
        if rows is not None:
            return rows
    pkg = static.PACKAGES.get(package_id)
    return dict(pkg) if pkg else None


def ability_code_to_engine_id(ability_id: str) -> str:
    """Map ruleset ability code (WAR-S3) to engine snake_case id."""
    return static.ABILITY_ID_MAP.get(ability_id, ability_id)


def _fetch_templates_from_supabase() -> list[dict[str, Any]] | None:
    if not is_supabase_configured():
        return None
    try:
        client = get_supabase_service_client()
        res = (
            client.table("campaign_templates")
            .select(
                "id,slug,name,description,genre,level_min,level_max,"
                "estimated_sessions,content_path,cover_image_url,ruleset_id"
            )
            .order("name")
            .execute()
        )
        return list(res.data or [])
    except Exception as exc:  # noqa: BLE001 — fall back to static catalog
        logger.warning(f"Supabase campaign_templates read failed: {exc}")
        return None


def _fetch_prebuilts_from_supabase(template_id: str) -> list[dict[str, Any]] | None:
    if not is_supabase_configured():
        return None
    try:
        client = get_supabase_service_client()
        res = (
            client.table("prebuilt_characters")
            .select(
                "id,campaign_template_id,class_id,name_male,name_female,level,"
                "race_id,default_package_id,starting_ability_id,character_data,"
                "hook,sort_order"
            )
            .eq("campaign_template_id", template_id)
            .order("sort_order")
            .execute()
        )
        return list(res.data or [])
    except Exception as exc:  # noqa: BLE001
        logger.warning(f"Supabase prebuilt_characters read failed: {exc}")
        return None


def _fetch_prebuilt_by_id(prebuilt_id: str) -> dict[str, Any] | None:
    if not is_supabase_configured():
        return None
    try:
        client = get_supabase_service_client()
        res = (
            client.table("prebuilt_characters")
            .select("*")
            .eq("id", prebuilt_id)
            .limit(1)
            .execute()
        )
        if res.data:
            return dict(res.data[0])
        return None
    except Exception as exc:  # noqa: BLE001
        logger.warning(f"Supabase prebuilt by id failed: {exc}")
        return None


def _fetch_packages_from_supabase(
    template_id: str, class_id: str | None
) -> list[dict[str, Any]] | None:
    if not is_supabase_configured():
        return None
    try:
        client = get_supabase_service_client()
        q = (
            client.table("starting_packages")
            .select(
                "id,campaign_template_id,class_id,label,theme,playstyle,"
                "ability_id,package_data,sort_order"
            )
            .eq("campaign_template_id", template_id)
        )
        if class_id:
            q = q.eq("class_id", class_id)
        res = q.order("sort_order").execute()
        return list(res.data or [])
    except Exception as exc:  # noqa: BLE001
        logger.warning(f"Supabase starting_packages read failed: {exc}")
        return None


def _fetch_package_by_id(package_id: str) -> dict[str, Any] | None:
    if not is_supabase_configured():
        return None
    try:
        client = get_supabase_service_client()
        res = (
            client.table("starting_packages")
            .select("*")
            .eq("id", package_id)
            .limit(1)
            .execute()
        )
        if res.data:
            return dict(res.data[0])
        return None
    except Exception as exc:  # noqa: BLE001
        logger.warning(f"Supabase package by id failed: {exc}")
        return None
