"""Onboarding API: templates, prebuilts, characters, start / continue / save."""

from __future__ import annotations

from pathlib import Path

from fastapi import APIRouter, HTTPException
from loguru import logger

from api.schemas import (
    CampaignTemplateSummary,
    CampaignTemplatesResponse,
    CreateCharacterRequest,
    CreateCharacterResponse,
    PackageSummary,
    PackagesResponse,
    PrebuiltCharacterSummary,
    PrebuiltCharactersResponse,
    RacesResponse,
    SaveCampaignResponse,
    StartCampaignRequest,
    StartCampaignResponse,
)
from api.snapshot import game_state_snapshot
from api.transcript_log import append_message, append_scene
from catalog.character_factory import (
    apply_template_to_game_state,
    character_from_draft,
    character_from_prebuilt,
    list_races,
    portrait_placeholder_key,
    resolve_template_slug,
)
from catalog.playthrough_store import SoloConflictError, playthrough_store
from catalog.service import list_packages_for_slug, list_prebuilts_for_slug, list_templates
from game.models import CharacterState, GameState
from game.session import store

router = APIRouter(tags=["onboarding"])

CAMPAIGNS_ROOT = Path(__file__).resolve().parent.parent / "campaigns"


@router.get("/campaign-templates", response_model=CampaignTemplatesResponse)
def get_campaign_templates():
    templates = []
    for t in list_templates():
        templates.append(
            CampaignTemplateSummary(
                id=t["id"],
                slug=t["slug"],
                name=t["name"],
                description=t.get("description"),
                genre=t.get("genre") or "fantasy",
                level_min=int(t.get("level_min") or 1),
                level_max=int(t.get("level_max") or 5),
                estimated_sessions=t.get("estimated_sessions"),
                cover_image_url=t.get("cover_image_url"),
                content_path=t.get("content_path") or "",
                recommended_players=int(t.get("recommended_players") or 4),
                avg_level=t.get("avg_level"),
            )
        )
    return CampaignTemplatesResponse(templates=templates)


@router.get("/races", response_model=RacesResponse)
def get_races():
    return RacesResponse(races=list_races())


@router.get(
    "/campaign-templates/{slug}/prebuilt-characters",
    response_model=PrebuiltCharactersResponse,
)
def get_prebuilt_characters(slug: str):
    rows = list_prebuilts_for_slug(slug)
    if rows is None:
        raise HTTPException(status_code=404, detail=f"Unknown campaign template: {slug}")
    prebuilts = []
    for p in rows:
        class_id = p["class_id"]
        prebuilts.append(
            PrebuiltCharacterSummary(
                id=p["id"],
                class_id=class_id,
                name_male=p["name_male"],
                name_female=p["name_female"],
                level=int(p.get("level") or 1),
                race_id=p.get("race_id"),
                hook=p.get("hook"),
                default_package_id=p.get("default_package_id"),
                starting_ability_id=p.get("starting_ability_id"),
                portrait_placeholder_key=portrait_placeholder_key(class_id, "male"),
                portrait_placeholder_key_male=portrait_placeholder_key(class_id, "male"),
                portrait_placeholder_key_female=portrait_placeholder_key(
                    class_id, "female"
                ),
                sort_order=int(p.get("sort_order") or 0),
            )
        )
    prebuilts.sort(key=lambda x: x.sort_order)
    return PrebuiltCharactersResponse(prebuilts=prebuilts)


@router.get(
    "/campaign-templates/{slug}/starting-packages",
    response_model=PackagesResponse,
)
def get_starting_packages(slug: str, class_id: str | None = None):
    rows = list_packages_for_slug(slug, class_id)
    if rows is None:
        raise HTTPException(status_code=404, detail=f"Unknown campaign template: {slug}")
    packages = []
    for pkg in rows:
        data = pkg.get("package_data") or {}
        packages.append(
            PackageSummary(
                id=pkg["id"],
                class_id=pkg["class_id"],
                label=pkg["label"],
                theme=pkg.get("theme"),
                playstyle=pkg.get("playstyle"),
                ability_id=pkg.get("ability_id") or "",
                inventory=list(data.get("inventory") or []),
                equipped_weapon=data.get("equipped_weapon"),
                equipped_armor=data.get("equipped_armor"),
                spells_known=list(data.get("spells_known") or []),
                gold=int(data.get("gold") or 10),
                sort_order=int(pkg.get("sort_order") or 0),
            )
        )
    return PackagesResponse(packages=packages)


@router.post("/characters", response_model=CreateCharacterResponse)
def create_character(body: CreateCharacterRequest):
    try:
        if body.source == "prebuilt":
            if not body.prebuilt_character_id or not body.gender:
                raise ValueError("prebuilt_character_id and gender are required")
            pc, meta = character_from_prebuilt(body.prebuilt_character_id, body.gender)
        else:
            draft = body.payload
            if draft is None:
                raise ValueError("payload is required for created characters")
            pc, meta = character_from_draft(draft.model_dump())
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc

    stored = playthrough_store.save_character(pc, meta)
    logger.info(f"Created character {stored.id} ({pc.name})")
    return CreateCharacterResponse(
        character_id=stored.id,
        name=pc.name,
        character_class=pc.character_class,
        gender=str(meta.get("gender") or "male"),
        race_id=meta.get("race_id"),
        level=pc.level,
        character=pc,
    )


@router.post("/active-campaigns", response_model=StartCampaignResponse)
def start_active_campaign(body: StartCampaignRequest):
    try:
        template = resolve_template_slug(body.campaign_template_slug)
    except ValueError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc

    # Solo conflict before creating a session (one incomplete solo per template)
    if body.solo_mode and not body.replace_existing_solo:
        existing = playthrough_store.find_incomplete_solo(template["slug"])
        if existing is not None:
            raise HTTPException(
                status_code=409,
                detail=_solo_conflict_detail(existing),
            )

    try:
        stored = _resolve_character(body, template)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc

    replaced_session_id = None
    if body.solo_mode and body.replace_existing_solo:
        existing = playthrough_store.find_incomplete_solo(template["slug"])
        if existing is not None:
            replaced_session_id = existing.session_id

    gs = _game_state_from_template(template, stored.pc, body.solo_mode)
    session = store.create(game_state=gs)
    _seed_transcript(session, gs)

    try:
        playthrough = playthrough_store.create_playthrough(
            owner_key="default",
            template=template,
            character=stored,
            solo_mode=body.solo_mode,
            session_id=session.id,
            replace_existing_solo=bool(body.replace_existing_solo),
        )
    except SoloConflictError as exc:
        store.delete(session.id)
        raise HTTPException(
            status_code=409,
            detail=_solo_conflict_detail(exc.existing_campaign_id),
        ) from exc

    if replaced_session_id:
        store.delete(replaced_session_id)

    logger.info(
        f"Started playthrough {playthrough.id} "
        f"({template['slug']}) session={session.id}"
    )
    return StartCampaignResponse(
        active_campaign_id=playthrough.id,
        character_id=stored.id,
        session_id=session.id,
        character_name=gs.pc.name if gs.pc else stored.pc.name,
        campaign_template_slug=template["slug"],
        game_state=game_state_snapshot(gs),
    )


@router.post(
    "/active-campaigns/{active_campaign_id}/continue",
    response_model=StartCampaignResponse,
)
def continue_active_campaign(active_campaign_id: str):
    """Resume a saved playthrough — reuse live session or recreate from snapshot."""
    pt = playthrough_store.get_playthrough(active_campaign_id)
    if pt is None or pt.completed:
        raise HTTPException(status_code=404, detail="Playthrough not found")

    if pt.session_id:
        live = store.get(pt.session_id)
        if live is not None:
            gs = live.game_state
            return StartCampaignResponse(
                active_campaign_id=pt.id,
                character_id=pt.character_id,
                session_id=live.id,
                character_name=gs.pc.name if gs.pc else pt.character_name,
                campaign_template_slug=pt.campaign_template_slug,
                game_state=game_state_snapshot(gs),
            )

    try:
        template = resolve_template_slug(pt.campaign_template_slug)
    except ValueError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc

    pc = _pc_for_playthrough(pt)
    gs = _game_state_from_template(template, pc, pt.solo_mode)
    gs.chapter = pt.chapter
    gs.scene_label = pt.last_scene or gs.scene_label
    gs.time_current = pt.time_current
    gs.time_max = pt.time_max

    session = store.create(game_state=gs)
    _seed_transcript(session, gs)
    playthrough_store.update_session_id(pt.id, session.id)

    logger.info(f"Continued playthrough {pt.id} as session={session.id}")
    return StartCampaignResponse(
        active_campaign_id=pt.id,
        character_id=pt.character_id,
        session_id=session.id,
        character_name=pc.name,
        campaign_template_slug=pt.campaign_template_slug,
        game_state=game_state_snapshot(gs),
    )


@router.post(
    "/active-campaigns/{active_campaign_id}/save",
    response_model=SaveCampaignResponse,
)
def save_active_campaign(active_campaign_id: str):
    """Snapshot the live session (or last known PC) into durable playthrough storage."""
    pt = playthrough_store.get_playthrough(active_campaign_id)
    if pt is None:
        raise HTTPException(status_code=404, detail="Playthrough not found")

    session = store.get(pt.session_id) if pt.session_id else None
    if session is None or session.game_state.pc is None:
        raise HTTPException(
            status_code=400,
            detail="No live session to save — call /continue first",
        )

    gs = session.game_state
    assert gs.pc is not None
    updated = playthrough_store.save_progress(
        active_campaign_id,
        pc=gs.pc,
        chapter=gs.chapter,
        time_current=gs.time_current,
        time_max=gs.time_max,
        last_scene=gs.scene_label,
        session_id=session.id,
    )
    logger.info(f"Saved playthrough {active_campaign_id}")
    return SaveCampaignResponse(
        active_campaign_id=updated.id,
        session_id=session.id,
        chapter=updated.chapter,
        time_current=updated.time_current,
        last_scene=updated.last_scene,
    )


@router.delete("/active-campaigns/{active_campaign_id}")
def abandon_active_campaign(active_campaign_id: str):
    """End/leave a playthrough — removes it from the lobby permanently."""
    pt = playthrough_store.get_playthrough(active_campaign_id)
    if pt is None:
        raise HTTPException(status_code=404, detail="Playthrough not found")

    session_id = pt.session_id
    deleted = playthrough_store.delete_playthrough(active_campaign_id)
    if deleted is None:
        raise HTTPException(status_code=404, detail="Playthrough not found")
    if session_id:
        store.delete(session_id)
    logger.info(f"Abandoned playthrough {active_campaign_id}")
    return {"ok": True, "active_campaign_id": active_campaign_id}


def _solo_conflict_detail(existing: object) -> dict:
    """Build 409 detail from a Playthrough or legacy playthrough id string."""
    if isinstance(existing, str):
        pt = playthrough_store.get_playthrough(existing)
        existing_campaign_id = existing
    else:
        pt = existing  # Playthrough-like
        existing_campaign_id = getattr(pt, "id")
    session_id = getattr(pt, "session_id", None) if pt is not None else None
    session_live = bool(session_id and store.get(session_id) is not None)
    return {
        "code": "solo_conflict",
        "existing_campaign_id": existing_campaign_id,
        "session_id": session_id,
        "session_live": session_live,
        "campaign_template_slug": getattr(pt, "campaign_template_slug", None)
        if pt is not None
        else None,
        "campaign_name": getattr(pt, "campaign_name", None) if pt is not None else None,
        "continue_path": f"/active-campaigns/{existing_campaign_id}/continue",
        "hint": "Only one incomplete solo playthrough is allowed per campaign template.",
    }


def _game_state_from_template(
    template: dict, pc: CharacterState, solo_mode: bool
) -> GameState:
    gs = GameState()
    gs.pc = pc.model_copy(deep=True)
    gs.solo_mode = solo_mode
    try:
        apply_template_to_game_state(gs, template, CAMPAIGNS_ROOT)
    except ValueError as exc:
        raise HTTPException(status_code=500, detail=str(exc)) from exc
    return gs


def _seed_transcript(session, gs: GameState) -> None:
    append_scene(session, f"Scene · {gs.scene_label}")
    name = gs.pc.name if gs.pc else "Adventurer"
    append_message(session, role="system", content=f"Session started. You are {name}.")


def _pc_for_playthrough(pt) -> CharacterState:
    stored = playthrough_store.get_character(pt.character_id)
    if stored is not None:
        return stored.pc.model_copy(deep=True)
    if pt.pc_snapshot:
        return CharacterState.model_validate(pt.pc_snapshot)
    raise HTTPException(status_code=500, detail="Playthrough has no character snapshot")


def _resolve_character(body: StartCampaignRequest, template: dict):
    char = body.character
    if char.source == "prebuilt":
        if not char.prebuilt_character_id or not char.gender:
            raise ValueError("prebuilt requires prebuilt_character_id and gender")
        pc, meta = character_from_prebuilt(char.prebuilt_character_id, char.gender)
        if meta.get("campaign_template_id") != template["id"]:
            raise ValueError("Prebuilt does not belong to this campaign template")
        return playthrough_store.save_character(pc, meta)

    if char.source == "created":
        if not char.character_id:
            raise ValueError("created requires character_id")
        stored = playthrough_store.get_character(char.character_id)
        if stored is None:
            raise ValueError(f"Unknown character_id: {char.character_id}")
        if stored.meta.get("campaign_template_id") != template["id"]:
            raise ValueError("Character does not belong to this campaign template")
        return stored

    if char.source == "inline":
        if char.payload is None:
            raise ValueError("inline requires payload")
        draft = char.payload.model_dump()
        draft.setdefault("campaign_template_id", template["id"])
        if draft.get("campaign_template_id") != template["id"]:
            raise ValueError("Draft campaign_template_id does not match start slug")
        pc, meta = character_from_draft(draft)
        return playthrough_store.save_character(pc, meta)

    raise ValueError(f"Unknown character source: {char.source}")
