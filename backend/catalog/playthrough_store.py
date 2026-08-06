"""Playthrough + character draft store with durable persistence."""

from __future__ import annotations

import uuid
from dataclasses import dataclass, field
from datetime import datetime, timezone
from typing import Any

from catalog import persistence as persist
from game.models import CharacterState, is_pending_level_up


def _now() -> str:
    return datetime.now(timezone.utc).isoformat()


@dataclass
class StoredCharacter:
    id: str
    pc: CharacterState
    meta: dict[str, Any]
    created_at: str = field(default_factory=_now)
    owner_id: str = "default"


@dataclass
class Playthrough:
    id: str
    campaign_template_slug: str
    campaign_template_id: str
    campaign_name: str
    character_id: str
    character_name: str
    character_class: str
    level: int
    xp: int
    gender: str
    solo_mode: bool
    session_id: str | None
    chapter: int
    time_current: int
    time_max: int
    last_scene: str
    level_min: int
    level_max: int
    avg_level: int | None
    recommended_players: int
    completed: bool = False
    created_at: str = field(default_factory=_now)
    pc_snapshot: dict[str, Any] | None = None
    owner_id: str = "default"
    game_state: dict[str, Any] | None = None


class PlaythroughStore:
    """Owner-scoped registry; durable via catalog.persistence."""

    def __init__(self) -> None:
        self._characters: dict[str, StoredCharacter] = {}
        self._playthroughs: dict[str, Playthrough] = {}
        # owner_key -> { campaign_template_slug -> playthrough_id }
        self._incomplete_solo: dict[str, dict[str, str]] = {}
        self._hydrated = False

    def clear(self) -> None:
        self._characters.clear()
        self._playthroughs.clear()
        self._incomplete_solo.clear()
        self._hydrated = True  # tests: don't reload from disk mid-suite
        if persist.persistence_mode() != "memory":
            persist.save_all(persist._empty_blob())  # noqa: SLF001

    def ensure_hydrated(self) -> None:
        if self._hydrated:
            return
        self._hydrate()
        self._hydrated = True

    def _hydrate(self) -> None:
        blob = persist.load_all()
        self._characters.clear()
        self._playthroughs.clear()
        self._incomplete_solo.clear()

        for cid, crow in (blob.get("characters") or {}).items():
            pc_data = crow.get("pc") or {}
            # Ensure CharacterState fields if snapshot is nested under name etc.
            try:
                pc = CharacterState.model_validate(pc_data)
            except Exception:  # noqa: BLE001
                continue
            self._characters[cid] = StoredCharacter(
                id=cid,
                pc=pc,
                meta=dict(crow.get("meta") or {}),
                created_at=str(crow.get("created_at") or _now()),
                owner_id=str(
                    crow.get("owner_id")
                    or (crow.get("meta") or {}).get("owner_id")
                    or "default"
                ),
            )

        for pid, prow in (blob.get("playthroughs") or {}).items():
            if not prow.get("campaign_template_slug"):
                continue
            self._playthroughs[pid] = Playthrough(
                id=pid,
                campaign_template_slug=str(prow["campaign_template_slug"]),
                campaign_template_id=str(prow["campaign_template_id"]),
                campaign_name=str(prow.get("campaign_name") or ""),
                character_id=str(prow.get("character_id") or ""),
                character_name=str(prow.get("character_name") or ""),
                character_class=str(prow.get("character_class") or ""),
                level=int(prow.get("level") or 1),
                xp=int(prow.get("xp") or 0),
                gender=str(prow.get("gender") or "male"),
                solo_mode=bool(prow.get("solo_mode")),
                session_id=prow.get("session_id"),
                chapter=int(prow.get("chapter") or 1),
                time_current=int(prow.get("time_current") or 0),
                time_max=int(prow.get("time_max") or 50),
                last_scene=str(prow.get("last_scene") or ""),
                level_min=int(prow.get("level_min") or 1),
                level_max=int(prow.get("level_max") or 5),
                avg_level=prow.get("avg_level"),
                recommended_players=int(prow.get("recommended_players") or 4),
                completed=bool(prow.get("completed")),
                created_at=str(prow.get("created_at") or _now()),
                pc_snapshot=prow.get("pc_snapshot"),
                owner_id=str(prow.get("owner_id") or "default"),
                game_state=prow.get("game_state"),
            )

        for owner, value in (blob.get("incomplete_solo") or {}).items():
            owner_key = str(owner)
            by_slug: dict[str, str] = {}
            if isinstance(value, dict):
                for slug, pid in value.items():
                    if str(pid) in self._playthroughs:
                        by_slug[str(slug)] = str(pid)
            elif isinstance(value, str) and value in self._playthroughs:
                # Legacy: one global solo id per owner → key by that playthrough's slug
                pt = self._playthroughs[value]
                by_slug[pt.campaign_template_slug] = value
            if by_slug:
                self._incomplete_solo[owner_key] = by_slug

        # Rebuild from playthroughs if blob missing nested map
        if not self._incomplete_solo:
            for pt in self._playthroughs.values():
                if pt.solo_mode and not pt.completed:
                    self._incomplete_solo.setdefault(pt.owner_id or "default", {})[
                        pt.campaign_template_slug
                    ] = pt.id

    def _flush(self) -> None:
        # Persist only characters bound to a playthrough (avoid orphan drafts).
        referenced = {p.character_id for p in self._playthroughs.values()}
        blob: dict[str, Any] = {
            "characters": {},
            "playthroughs": {},
            "incomplete_solo": {
                owner: dict(by_slug)
                for owner, by_slug in self._incomplete_solo.items()
            },
        }
        for cid, crow in self._characters.items():
            if cid not in referenced:
                continue
            blob["characters"][cid] = {
                "id": cid,
                "owner_id": crow.owner_id,
                "pc": crow.pc.model_dump(),
                "meta": {**crow.meta, "owner_id": crow.owner_id},
                "created_at": crow.created_at,
            }
        for pid, pt in self._playthroughs.items():
            blob["playthroughs"][pid] = {
                "id": pt.id,
                "owner_id": pt.owner_id,
                "campaign_template_slug": pt.campaign_template_slug,
                "campaign_template_id": pt.campaign_template_id,
                "campaign_name": pt.campaign_name,
                "character_id": pt.character_id,
                "character_name": pt.character_name,
                "character_class": pt.character_class,
                "level": pt.level,
                "xp": pt.xp,
                "gender": pt.gender,
                "solo_mode": pt.solo_mode,
                "session_id": pt.session_id,
                "chapter": pt.chapter,
                "time_current": pt.time_current,
                "time_max": pt.time_max,
                "last_scene": pt.last_scene,
                "level_min": pt.level_min,
                "level_max": pt.level_max,
                "avg_level": pt.avg_level,
                "recommended_players": pt.recommended_players,
                "completed": pt.completed,
                "created_at": pt.created_at,
                "pc_snapshot": pt.pc_snapshot
                or (
                    self._characters[pt.character_id].pc.model_dump()
                    if pt.character_id in self._characters
                    else None
                ),
                "game_state": pt.game_state,
            }
        persist.save_all(blob)

    def save_character(
        self,
        pc: CharacterState,
        meta: dict[str, Any],
        character_id: str | None = None,
        owner_id: str = "default",
    ) -> StoredCharacter:
        self.ensure_hydrated()
        cid = character_id or str(uuid.uuid4())
        meta = {**dict(meta), "owner_id": owner_id}
        row = StoredCharacter(
            id=cid,
            pc=pc.model_copy(deep=True),
            meta=meta,
            owner_id=owner_id,
        )
        self._characters[cid] = row
        self._flush()
        return row

    def get_character(self, character_id: str) -> StoredCharacter | None:
        self.ensure_hydrated()
        return self._characters.get(character_id)

    def find_incomplete_solo(
        self,
        campaign_template_slug: str,
        owner_key: str = "default",
    ) -> Playthrough | None:
        """Return the incomplete solo playthrough for this template, if any."""
        self.ensure_hydrated()
        by_slug = self._incomplete_solo.get(owner_key) or {}
        pid = by_slug.get(campaign_template_slug)
        if not pid:
            return None
        return self._playthroughs.get(pid)

    def get_playthrough(self, playthrough_id: str) -> Playthrough | None:
        self.ensure_hydrated()
        return self._playthroughs.get(playthrough_id)

    def find_by_session_id(self, session_id: str) -> Playthrough | None:
        """Return the playthrough whose live session_id matches, if any."""
        self.ensure_hydrated()
        if not session_id:
            return None
        for pt in self._playthroughs.values():
            if pt.session_id == session_id and not pt.completed:
                return pt
        return None

    def delete_playthrough(
        self, playthrough_id: str, owner_key: str = "default"
    ) -> Playthrough | None:
        self.ensure_hydrated()
        pt = self._playthroughs.pop(playthrough_id, None)
        if pt is None:
            return None
        owner = pt.owner_id or owner_key
        by_slug = self._incomplete_solo.get(owner)
        if by_slug:
            for slug, pid in list(by_slug.items()):
                if pid == playthrough_id:
                    del by_slug[slug]
            if not by_slug:
                del self._incomplete_solo[owner]
        still_used = any(
            p.character_id == pt.character_id for p in self._playthroughs.values()
        )
        if not still_used:
            self._characters.pop(pt.character_id, None)
        self._flush()
        return pt

    def create_playthrough(
        self,
        *,
        owner_key: str,
        template: dict[str, Any],
        character: StoredCharacter,
        solo_mode: bool,
        session_id: str,
        replace_existing_solo: bool = False,
        game_state: dict[str, Any] | None = None,
    ) -> Playthrough:
        self.ensure_hydrated()
        slug = str(template["slug"])
        if solo_mode:
            by_slug = self._incomplete_solo.setdefault(owner_key, {})
            existing_id = by_slug.get(slug)
            if existing_id and not replace_existing_solo:
                raise SoloConflictError(existing_id)
            if existing_id and replace_existing_solo:
                self.delete_playthrough(existing_id, owner_key)

        pc = character.pc
        character.owner_id = owner_key
        character.meta["owner_id"] = owner_key
        pt = Playthrough(
            id=str(uuid.uuid4()),
            campaign_template_slug=slug,
            campaign_template_id=template["id"],
            campaign_name=template["name"],
            character_id=character.id,
            character_name=pc.name,
            character_class=pc.character_class,
            level=pc.level,
            xp=pc.xp,
            gender=str(character.meta.get("gender") or "male"),
            solo_mode=solo_mode,
            session_id=session_id,
            chapter=int(template.get("opening_chapter") or 1),
            time_current=int(
                template.get("opening_time_current")
                if template.get("opening_time_current") is not None
                else template.get("time_max") or 50
            ),
            time_max=int(template.get("time_max") or 50),
            last_scene=str(template.get("opening_scene") or ""),
            level_min=int(template.get("level_min") or 1),
            level_max=int(template.get("level_max") or 5),
            avg_level=template.get("avg_level"),
            recommended_players=int(template.get("recommended_players") or 4),
            completed=False,
            pc_snapshot=pc.model_dump(),
            owner_id=owner_key,
            game_state=game_state,
        )
        self._playthroughs[pt.id] = pt
        if solo_mode:
            self._incomplete_solo.setdefault(owner_key, {})[slug] = pt.id
        self._flush()
        return pt

    def update_session_id(self, playthrough_id: str, session_id: str) -> None:
        self.ensure_hydrated()
        pt = self._playthroughs.get(playthrough_id)
        if pt is None:
            return
        pt.session_id = session_id
        self._flush()

    def save_progress(
        self,
        playthrough_id: str,
        *,
        pc: CharacterState,
        chapter: int,
        time_current: int,
        time_max: int,
        last_scene: str,
        session_id: str | None = None,
        game_state: dict[str, Any] | None = None,
    ) -> Playthrough:
        self.ensure_hydrated()
        pt = self._playthroughs.get(playthrough_id)
        if pt is None:
            raise KeyError(playthrough_id)
        pt.chapter = chapter
        pt.time_current = time_current
        pt.time_max = time_max
        pt.last_scene = last_scene
        pt.character_name = pc.name
        pt.character_class = pc.character_class
        pt.level = pc.level
        pt.xp = pc.xp
        pt.pc_snapshot = pc.model_dump()
        if game_state is not None:
            pt.game_state = game_state
        if session_id is not None:
            pt.session_id = session_id
        stored = self._characters.get(pt.character_id)
        if stored is not None:
            stored.pc = pc.model_copy(deep=True)
        self._flush()
        return pt

    def list_playthroughs(self, owner_key: str = "default") -> list[Playthrough]:
        self.ensure_hydrated()
        rows = [
            p
            for p in self._playthroughs.values()
            if not p.completed and p.owner_id == owner_key
        ]
        rows.sort(key=lambda p: p.created_at, reverse=True)
        return rows

    def to_campaign_summary(self, pt: Playthrough, *, active: bool) -> dict[str, Any]:
        snap = pt.pc_snapshot or {}
        if not snap and pt.character_id in self._characters:
            snap = self._characters[pt.character_id].pc.model_dump()
        stats = snap.get("stats") or {}
        return {
            "id": pt.id,
            "name": pt.campaign_name,
            "chapter": pt.chapter,
            "time_current": pt.time_current,
            "time_max": pt.time_max,
            "last_scene": pt.last_scene,
            "character_name": pt.character_name,
            "character_class": pt.character_class,
            "level": pt.level,
            "pending_level_up": is_pending_level_up(pt.xp, pt.level),
            "active": active,
            "recommended_players": pt.recommended_players,
            "level_min": pt.level_min,
            "level_max": pt.level_max,
            "avg_level": pt.avg_level,
            "solo_mode": pt.solo_mode,
            "campaign_template_slug": pt.campaign_template_slug,
            "session_id": pt.session_id,
            "character_id": pt.character_id,
            "xp": int(snap.get("xp") if snap.get("xp") is not None else pt.xp or 0),
            "hp": int(snap.get("hp") if snap.get("hp") is not None else 1),
            "hp_max": int(snap.get("hp_max") if snap.get("hp_max") is not None else 1),
            "mana": snap.get("mana"),
            "mana_max": snap.get("mana_max"),
            "evasion": int(snap.get("evasion") if snap.get("evasion") is not None else 10),
            "finesse": int(stats.get("finesse") or 0),
        }


class SoloConflictError(Exception):
    def __init__(self, existing_campaign_id: str):
        self.existing_campaign_id = existing_campaign_id
        super().__init__(f"Incomplete solo campaign exists: {existing_campaign_id}")


playthrough_store = PlaythroughStore()
