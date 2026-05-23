"""FastAPI application — exposes session/turn endpoints for the chat UI."""

import json
import os
import random

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse
from loguru import logger

from game.models import DICE_SIDES, GameState, create_player_character
from api.campaigns import list_campaigns
from api.enrichment import build_pending_action
from api.level_up import apply_level_up
from api.roll_result import build_roll_result_payload
from api.schemas import (
    BossDeathRequest,
    CampaignListResponse,
    CreateSessionRequest,
    CreateSessionResponse,
    GameStateSnapshot,
    LevelUpRequest,
    MessageEntry,
    MessagesResponse,
    TurnRequest,
)
from api.session_actions import apply_boss_death, handle_player_action
from api.snapshot import game_state_snapshot
from api.transcript_log import (
    append_message,
    append_roll_result,
    append_scene,
)
from game.session import store
from api.turn_engine import stream_deferred_response, stream_turn
from supabase_client import is_supabase_configured

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


@app.get("/campaigns", response_model=CampaignListResponse)
def get_campaigns():
    return list_campaigns()


@app.post("/sessions", response_model=CreateSessionResponse)
def create_session(body: CreateSessionRequest | None = None):
    gs = GameState()
    gs.pc = create_player_character()
    session = store.create(game_state=gs)
    logger.info(f"Created session {session.id} for {gs.pc.name}")

    append_scene(session, f"Scene · {gs.scene_label}")
    append_message(
        session,
        role="system",
        content=f"Session started. You are {gs.pc.name}.",
    )

    return CreateSessionResponse(
        session_id=session.id,
        character_name=gs.pc.name,
        game_state=game_state_snapshot(gs),
    )


@app.get("/sessions/{session_id}/messages", response_model=MessagesResponse)
def get_messages(session_id: str):
    session = store.get(session_id)
    if session is None:
        raise HTTPException(status_code=404, detail="Session not found")

    entries: list[MessageEntry] = []
    for msg in session.message_history:
        kind = msg.kind
        if kind == "request":
            for part in msg.parts:
                if part.part_kind == "user-prompt":
                    entries.append(MessageEntry(role="player", content=part.content))
        elif kind == "response":
            for part in msg.parts:
                if part.part_kind == "text":
                    entries.append(MessageEntry(role="gm", content=part.content))

    return MessagesResponse(
        messages=entries,
        transcript=session.transcript,
    )


@app.post("/sessions/{session_id}/level-up")
def submit_level_up(session_id: str, body: LevelUpRequest):
    session = store.get(session_id)
    if session is None:
        raise HTTPException(status_code=404, detail="Session not found")
    if session.game_state.pc is None:
        raise HTTPException(status_code=400, detail="No character")

    try:
        updated = apply_level_up(
            session.game_state.pc,
            kind=body.kind,
            hp_mode=body.hp_mode,
            hp_amount=body.hp_amount,
            ability_id=body.ability_id,
        )
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e)) from e

    session.game_state.pc = updated
    session.game_state.in_combat = False
    append_message(
        session,
        role="system",
        content=f"Level up! Now Lv {updated.level}. Choice: {body.kind}.",
    )
    return {"game_state": game_state_snapshot(session.game_state).model_dump()}


@app.post("/sessions/{session_id}/boss-death")
def submit_boss_death(session_id: str, body: BossDeathRequest):
    session = store.get(session_id)
    if session is None:
        raise HTTPException(status_code=404, detail="Session not found")

    text = apply_boss_death(session.game_state, body.choice)
    append_message(session, role="system", content=text)
    return {"game_state": game_state_snapshot(session.game_state).model_dump()}


@app.post("/sessions/{session_id}/turns")
async def submit_turn(session_id: str, body: TurnRequest):
    session = store.get(session_id)
    if session is None:
        raise HTTPException(status_code=404, detail="Session not found")

    roll_result_event: dict | None = None

    # Player actions without agent turn (G5, G6)
    if (
        body.rest_type is not None
        or body.use_item is not None
        or body.cast_spell is not None
    ):
        if body.message or body.action_response:
            raise HTTPException(
                status_code=400,
                detail="Combine player actions with message/roll in one request",
            )
        try:
            _, roll_payload = handle_player_action(
                session,
                rest_type=body.rest_type,
                use_item=body.use_item,
                cast_spell=body.cast_spell,
            )
        except ValueError as e:
            raise HTTPException(status_code=400, detail=str(e)) from e

        if roll_payload is not None:
            roll_result_event = roll_payload.model_dump(by_alias=True)

        async def action_sse():
            if roll_result_event:
                yield f"event: roll_result\ndata: {json.dumps({'roll_result': roll_result_event})}\n\n"
            yield (
                "event: complete\n"
                f"data: {json.dumps({'game_state': game_state_snapshot(session.game_state).model_dump()})}\n\n"
            )

        return StreamingResponse(action_sse(), media_type="text/event-stream")

    # Deferred action response (player dice roll)
    if body.action_response is not None:
        if session.pending_deferred is None:
            raise HTTPException(
                status_code=400, detail="No pending action for this session"
            )

        ar = body.action_response
        pending_call = session.pending_deferred.deferred_calls[0]
        args = pending_call["args"]
        pending = build_pending_action(
            pending_call["tool_name"],
            pending_call["tool_call_id"],
            args,
            session.game_state,
        )
        roll_payload = build_roll_result_payload(pending, ar)
        append_roll_result(session, roll_payload)
        roll_result_event = roll_payload.model_dump(by_alias=True)

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
        if roll_result_event:
            yield f"event: roll_result\ndata: {json.dumps({'roll_result': roll_result_event})}\n\n"
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
