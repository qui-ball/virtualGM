"""Hybrid player transcript archive (Feature 07).

Recent entries are stored verbatim; older prefixes are folded into append-only
summary segments when size/count thresholds are crossed.
"""

from __future__ import annotations

import json
import os
from pathlib import Path
from typing import Any

from loguru import logger

from catalog import persistence as persist
from supabase_client import get_supabase_service_client, is_supabase_configured

TRANSCRIPT_RAW_MAX_BYTES = int(os.getenv("TRANSCRIPT_RAW_MAX_BYTES", "100000"))
TRANSCRIPT_RAW_MAX_ENTRIES = int(os.getenv("TRANSCRIPT_RAW_MAX_ENTRIES", "100"))
TRANSCRIPT_SUMMARY_TIMEOUT = int(os.getenv("TRANSCRIPT_SUMMARY_TIMEOUT", "120"))

DATA_DIR = Path(__file__).resolve().parent.parent / "data" / "transcripts"

# In-memory archives when VIRTUALGM_PLAYTHROUGH_STORE=memory (tests / no disk).
_memory_archives: dict[str, dict[str, Any]] = {}


def _empty_archive() -> dict[str, Any]:
    return {"summaries": [], "entries": []}


def clear_memory_archives_for_tests() -> None:
    _memory_archives.clear()


def load_archive(playthrough_id: str) -> dict[str, Any]:
    mode = persist.persistence_mode()
    if mode == "memory":
        return dict(_memory_archives.get(playthrough_id) or _empty_archive())
    if mode == "supabase" and is_supabase_configured():
        try:
            return _load_supabase(playthrough_id)
        except Exception as exc:  # noqa: BLE001
            logger.warning(f"Transcript archive supabase load failed: {exc}")
    return _load_file(playthrough_id)


def save_archive(playthrough_id: str, archive: dict[str, Any]) -> None:
    mode = persist.persistence_mode()
    if mode == "memory":
        _memory_archives[playthrough_id] = {
            "summaries": list(archive.get("summaries") or []),
            "entries": list(archive.get("entries") or []),
        }
        return
    if mode == "supabase" and is_supabase_configured():
        try:
            _save_supabase(playthrough_id, archive)
            _save_file(playthrough_id, archive)
            return
        except Exception as exc:  # noqa: BLE001
            logger.warning(f"Transcript archive supabase save failed: {exc}")
    _save_file(playthrough_id, archive)


def append_entries(playthrough_id: str, entries: list[dict[str, Any]]) -> dict[str, Any]:
    """Merge new transcript entries (by entry id) and optionally compact."""
    archive = load_archive(playthrough_id)
    by_id = {
        str(e.get("id") or e.get("entry_id")): e
        for e in archive.get("entries") or []
        if e.get("id") or e.get("entry_id")
    }
    for e in entries:
        eid = str(e.get("id") or "")
        if not eid:
            continue
        by_id[eid] = e
    archive["entries"] = sorted(
        by_id.values(),
        key=lambda x: float(x.get("timestamp") or 0),
    )
    archive = maybe_compact(archive)
    save_archive(playthrough_id, archive)
    return archive


def replace_live_transcript(
    playthrough_id: str, entries: list[dict[str, Any]]
) -> dict[str, Any]:
    """Replace raw window with the live session transcript (keep summaries)."""
    archive = load_archive(playthrough_id)
    archive["entries"] = [e for e in entries if e.get("id")]
    archive = maybe_compact(archive)
    save_archive(playthrough_id, archive)
    return archive


def maybe_compact(archive: dict[str, Any]) -> dict[str, Any]:
    entries = list(archive.get("entries") or [])
    raw = json.dumps(entries, default=str)
    if (
        len(entries) <= TRANSCRIPT_RAW_MAX_ENTRIES
        and len(raw.encode("utf-8")) <= TRANSCRIPT_RAW_MAX_BYTES
    ):
        return archive

    keep = max(1, TRANSCRIPT_RAW_MAX_ENTRIES // 2)
    if len(entries) <= keep:
        # Over size threshold with a short list — still fold the older half.
        keep = max(1, len(entries) // 2)
    if len(entries) <= keep:
        return archive

    prefix = entries[:-keep]
    suffix = entries[-keep:]
    try:
        summary_text = _summarize_entries(prefix)
    except Exception as exc:  # noqa: BLE001
        logger.warning(f"Transcript summarize skipped: {exc}")
        return archive

    summaries = list(archive.get("summaries") or [])
    next_index = (max((s.get("segment_index") or 0) for s in summaries) + 1) if summaries else 1
    summaries.append(
        {
            "segment_index": next_index,
            "summary_text": summary_text,
            "covered_entry_id_from": str(prefix[0].get("id") or ""),
            "covered_entry_id_to": str(prefix[-1].get("id") or ""),
        }
    )
    archive["summaries"] = summaries
    archive["entries"] = suffix
    return archive


def _summarize_entries(entries: list[dict[str, Any]]) -> str:
    """Deterministic stub summarizer (no LLM dependency for POC reliability)."""
    lines: list[str] = []
    for e in entries:
        kind = e.get("kind") or "message"
        if kind == "message":
            role = e.get("role") or "gm"
            content = str(e.get("content") or "").strip()
            if content:
                lines.append(f"{role}: {content[:240]}")
        elif kind == "scene":
            lines.append(f"scene: {e.get('text') or ''}")
        elif kind in {"combat_start", "combat_end", "rest", "item"}:
            lines.append(f"{kind}: {e.get('text') or ''}")
        else:
            lines.append(f"{kind}")
    joined = " · ".join(lines[:40])
    if len(joined) > 1800:
        joined = joined[:1800] + "…"
    return f"Earlier in the adventure: {joined}" if joined else "Earlier events (summary empty)."


def _file_path(playthrough_id: str) -> Path:
    return DATA_DIR / f"{playthrough_id}.json"


def _load_file(playthrough_id: str) -> dict[str, Any]:
    path = _file_path(playthrough_id)
    if not path.is_file():
        return _empty_archive()
    try:
        data = json.loads(path.read_text(encoding="utf-8"))
        if not isinstance(data, dict):
            return _empty_archive()
        data.setdefault("summaries", [])
        data.setdefault("entries", [])
        return data
    except Exception:
        return _empty_archive()


def _save_file(playthrough_id: str, archive: dict[str, Any]) -> None:
    try:
        DATA_DIR.mkdir(parents=True, exist_ok=True)
        path = _file_path(playthrough_id)
        tmp = path.with_suffix(".tmp")
        tmp.write_text(json.dumps(archive, indent=2, default=str), encoding="utf-8")
        tmp.replace(path)
    except OSError as exc:
        logger.warning(f"Transcript file save failed ({exc}); keeping memory copy")
        _memory_archives[playthrough_id] = {
            "summaries": list(archive.get("summaries") or []),
            "entries": list(archive.get("entries") or []),
        }


def _load_supabase(playthrough_id: str) -> dict[str, Any]:
    client = get_supabase_service_client()
    summaries = (
        client.table("playthrough_transcript_summaries")
        .select("segment_index,summary_text,covered_entry_id_from,covered_entry_id_to,created_at")
        .eq("active_campaign_id", playthrough_id)
        .order("segment_index")
        .execute()
    )
    entries = (
        client.table("playthrough_transcript_entries")
        .select("entry_id,entry,entry_order")
        .eq("active_campaign_id", playthrough_id)
        .order("entry_order")
        .execute()
    )
    return {
        "summaries": list(summaries.data or []),
        "entries": [
            {**(r.get("entry") or {}), "id": r.get("entry_id") or (r.get("entry") or {}).get("id")}
            for r in (entries.data or [])
        ],
    }


def _save_supabase(playthrough_id: str, archive: dict[str, Any]) -> None:
    client = get_supabase_service_client()
    client.table("playthrough_transcript_entries").delete().eq(
        "active_campaign_id", playthrough_id
    ).execute()
    client.table("playthrough_transcript_summaries").delete().eq(
        "active_campaign_id", playthrough_id
    ).execute()

    for s in archive.get("summaries") or []:
        client.table("playthrough_transcript_summaries").insert(
            {
                "active_campaign_id": playthrough_id,
                "segment_index": int(s.get("segment_index") or 1),
                "summary_text": s.get("summary_text") or "",
                "covered_entry_id_from": s.get("covered_entry_id_from"),
                "covered_entry_id_to": s.get("covered_entry_id_to"),
            }
        ).execute()

    for e in archive.get("entries") or []:
        eid = str(e.get("id") or "")
        if not eid:
            continue
        client.table("playthrough_transcript_entries").insert(
            {
                "active_campaign_id": playthrough_id,
                "entry_id": eid,
                "entry": e,
            }
        ).execute()
