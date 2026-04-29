"""FastAPI application — exposes session/turn endpoints for the chat UI."""

import json
import os
import random
from pathlib import Path

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse
from loguru import logger

from game.models import DICE_SIDES, GameState, create_player_character
from api.schemas import (
    CampaignSummary,
    CampaignsResponse,
    CreateSessionRequest,
    CreateSessionResponse,
    MessageEntry,
    MessagesResponse,
    TurnRequest,
)
from game.session import store
from api.turn_engine import stream_deferred_response, stream_turn
from supabase_client import get_supabase_service_client, is_supabase_configured

# Importing agent triggers config + tool registration
import agent as agent_mod  # noqa: F401

app = FastAPI(title="Virtual GM API")

# CORS: browser origin must match when testing from another device (http://<LAN-IP>:5173).
_env = os.getenv("ENV", "development")
_cors_origins = ["http://localhost:5173", "http://127.0.0.1:5173"]
_cors_origin_regex: str | None = None
if _env == "development":
    _cors_origin_regex = (
        r"^https?://("
        r"localhost|127\.0\.0\.1"
        r"|192\.168\.\d{1,3}\.\d{1,3}"
        r"|10\.\d{1,3}\.\d{1,3}\.\d{1,3}"
        r"|172\.(1[6-9]|2[0-9]|3[0-1])\.\d{1,3}\.\d{1,3}"
        r")(:\d+)?$"
    )

app.add_middleware(
    CORSMiddleware,
    allow_origins=_cors_origins,
    allow_origin_regex=_cors_origin_regex,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/health")
def health():
    return {
        "status": "ok",
        "supabase_configured": is_supabase_configured(),
    }


def _default_campaign_dir() -> str:
    return str(Path(__file__).parent / "campaigns" / "LostMineOfPhandelverAdapted")


def _resolve_campaign_dir(campaign_state: dict | None) -> str:
    if not isinstance(campaign_state, dict):
        return _default_campaign_dir()

    raw_dir = campaign_state.get("campaign_dir")
    if isinstance(raw_dir, str) and raw_dir.strip():
        return raw_dir

    raw_relative = campaign_state.get("campaign_dir_relative")
    if isinstance(raw_relative, str) and raw_relative.strip():
        return str(Path(__file__).parent / raw_relative.strip())

    return _default_campaign_dir()


def _fetch_active_campaigns() -> list[CampaignSummary]:
    if not is_supabase_configured():
        return [
            CampaignSummary(
                id="local-lost-mine",
                name="Lost Mine of Phandelver (Local)",
            )
        ]

    sb = get_supabase_service_client()
    active_res = (
        sb.table("active_campaigns")
        .select("id,campaign_template_id,is_completed")
        .eq("is_completed", False)
        .order("created_at")
        .execute()
    )
    active_rows = active_res.data or []
    if not active_rows:
        # Non-blocking dev fallback: expose active templates when active_campaigns is empty.
        template_res = (
            sb.table("campaign_templates")
            .select("id,name")
            .eq("is_active", True)
            .order("created_at")
            .limit(10)
            .execute()
        )
        template_rows = template_res.data or []
        return [
            CampaignSummary(id=row["id"], name=f"{row['name']} (Template)")
            for row in template_rows
            if isinstance(row.get("id"), str) and isinstance(row.get("name"), str)
        ]

    template_ids = {
        row.get("campaign_template_id")
        for row in active_rows
        if row.get("campaign_template_id")
    }
    template_name_by_id: dict[str, str] = {}
    if template_ids:
        template_res = (
            sb.table("campaign_templates")
            .select("id,name")
            .in_("id", list(template_ids))
            .execute()
        )
        for row in template_res.data or []:
            row_id = row.get("id")
            row_name = row.get("name")
            if isinstance(row_id, str) and isinstance(row_name, str):
                template_name_by_id[row_id] = row_name

    campaigns: list[CampaignSummary] = []
    for row in active_rows:
        row_id = row.get("id")
        template_id = row.get("campaign_template_id")
        if not isinstance(row_id, str):
            continue
        campaigns.append(
            CampaignSummary(
                id=row_id,
                name=template_name_by_id.get(str(template_id), f"Campaign {row_id[:8]}"),
            )
        )
    return campaigns


@app.get("/campaigns", response_model=CampaignsResponse)
def get_campaigns():
    return CampaignsResponse(campaigns=_fetch_active_campaigns())


@app.post("/sessions", response_model=CreateSessionResponse)
def create_session(body: CreateSessionRequest | None = None):
    requested_campaign_id = body.active_campaign_id if body else None

    gs = GameState()
    gs.pc = create_player_character()
    gs.campaign_dir = _default_campaign_dir()

    campaign_id: str | None = None
    campaign_name: str | None = None

    if is_supabase_configured():
        sb = get_supabase_service_client()

        if requested_campaign_id:
            active_res = (
                sb.table("active_campaigns")
                .select("id,campaign_template_id,campaign_state")
                .eq("id", requested_campaign_id)
                .limit(1)
                .execute()
            )
            active_rows = active_res.data or []
            active_campaign = active_rows[0] if active_rows else None
        else:
            active_res = (
                sb.table("active_campaigns")
                .select("id,campaign_template_id,campaign_state")
                .eq("is_completed", False)
                .order("created_at")
                .limit(1)
                .execute()
            )
            active_rows = active_res.data or []
            active_campaign = active_rows[0] if active_rows else None

        if active_campaign:
            campaign_id = active_campaign.get("id")
            template_id = active_campaign.get("campaign_template_id")
            campaign_state = active_campaign.get("campaign_state")
            gs.campaign_dir = _resolve_campaign_dir(campaign_state)

            if template_id:
                template_res = (
                    sb.table("campaign_templates")
                    .select("name")
                    .eq("id", template_id)
                    .limit(1)
                    .execute()
                )
                template_rows = template_res.data or []
                if template_rows:
                    campaign_name = template_rows[0].get("name")
        elif requested_campaign_id:
            # Allow selecting a template fallback ID without blocking session creation.
            template_res = (
                sb.table("campaign_templates")
                .select("id,name")
                .eq("id", requested_campaign_id)
                .eq("is_active", True)
                .limit(1)
                .execute()
            )
            template_rows = template_res.data or []
            if not template_rows:
                raise HTTPException(status_code=404, detail="Campaign not found")
            campaign_name = template_rows[0].get("name")

    session = store.create(
        game_state=gs,
        active_campaign_id=campaign_id,
        campaign_name=campaign_name,
    )
    logger.info(f"Created session {session.id} for {gs.pc.name}")
    return CreateSessionResponse(
        session_id=session.id,
        character_name=gs.pc.name,
        active_campaign_id=campaign_id,
        campaign_name=campaign_name,
    )


@app.get("/sessions/{session_id}/messages", response_model=MessagesResponse)
def get_messages(session_id: str):
    session = store.get(session_id)
    if session is None:
        raise HTTPException(status_code=404, detail="Session not found")

    entries: list[MessageEntry] = []
    for msg in session.message_history:
        kind = msg.kind  # 'request', 'response', 'retry-prompt', etc.
        if kind == "request":
            for part in msg.parts:
                part_kind = part.part_kind
                if part_kind == "user-prompt":
                    entries.append(MessageEntry(role="player", content=part.content))
        elif kind == "response":
            for part in msg.parts:
                part_kind = part.part_kind
                if part_kind == "text":
                    entries.append(MessageEntry(role="gm", content=part.content))

    return MessagesResponse(messages=entries)


@app.post("/sessions/{session_id}/turns")
async def submit_turn(session_id: str, body: TurnRequest):
    session = store.get(session_id)
    if session is None:
        raise HTTPException(status_code=404, detail="Session not found")

    # Deferred action response (player dice roll)
    if body.action_response is not None:
        if session.pending_deferred is None:
            raise HTTPException(
                status_code=400, detail="No pending action for this session"
            )

        ar = body.action_response
        # Build a roll result string identical to what the CLI produces
        pending_call = session.pending_deferred.deferred_calls[0]
        args = pending_call["args"]
        dice_count = args.get("dice_count", 1)
        dice_type = args.get("dice_type", "d20")

        if ar.individual_rolls:
            rolls = ar.individual_rolls
        else:
            rolls = (
                [ar.roll_result]
                if dice_count == 1
                else _distribute(ar.roll_result, dice_count, dice_type)
            )

        total = sum(rolls)
        if dice_count == 1:
            result_str = f"🎲 [{dice_count}{dice_type}] → {total}"
            if dice_type == "d20" and total == 20:
                result_str += " (NATURAL 20 - CRITICAL HIT!)"
        else:
            result_str = f"🎲 [{dice_count}{dice_type}] → {rolls} = {total}"

        logger.info(result_str)
        event_source = stream_deferred_response(session, result_str)

    elif body.message is not None:
        event_source = stream_turn(session, body.message)

    else:
        raise HTTPException(
            status_code=400, detail="Either message or action_response is required"
        )

    async def sse_stream():
        async for event_type, data in event_source:
            yield f"event: {event_type}\ndata: {json.dumps(data)}\n\n"

    return StreamingResponse(sse_stream(), media_type="text/event-stream")


def _distribute(total: int, count: int, dice_type: str) -> list[int]:
    """Best-effort split of a total into individual die values."""
    sides = DICE_SIDES.get(dice_type, 6)  # type: ignore[arg-type]
    rolls = []
    remaining = total
    for i in range(count):
        left = count - i - 1
        lo = max(1, remaining - left * sides)
        hi = min(sides, remaining - left)
        val = random.randint(lo, hi) if lo <= hi else lo
        rolls.append(val)
        remaining -= val
    return rolls
