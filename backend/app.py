"""FastAPI application — exposes session/turn endpoints for the chat UI."""

import json
import os
import random

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse
from loguru import logger

from game.models import DICE_SIDES, GameState, create_player_character
from api.schemas import (
    CreateSessionRequest,
    CreateSessionResponse,
    MessageEntry,
    MessagesResponse,
    TurnRequest,
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


@app.post("/sessions", response_model=CreateSessionResponse)
def create_session(body: CreateSessionRequest | None = None):
    gs = GameState()
    gs.pc = create_player_character()
    session = store.create(game_state=gs)
    logger.info(f"Created session {session.id} for {gs.pc.name}")
    return CreateSessionResponse(
        session_id=session.id,
        character_name=gs.pc.name,
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
