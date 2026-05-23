"""Append structured transcript rows on a session (G10)."""

import time
import uuid

from api.schemas import PendingAction, RollResultPayload, TranscriptEntry
from game.session import Session


def _entry_id() -> str:
    return f"{int(time.time() * 1000)}-{uuid.uuid4().hex[:7]}"


def append_scene(session: Session, text: str) -> TranscriptEntry:
    entry = TranscriptEntry(
        kind="scene",
        id=_entry_id(),
        timestamp=time.time(),
        text=text,
    )
    session.transcript.append(entry)
    return entry


def append_message(
    session: Session,
    *,
    role: str,
    content: str,
) -> TranscriptEntry:
    entry = TranscriptEntry(
        kind="message",
        id=_entry_id(),
        timestamp=time.time(),
        role=role,
        content=content,
    )
    session.transcript.append(entry)
    return entry


def append_roll_prompt(
    session: Session,
    pending: PendingAction,
) -> TranscriptEntry:
    entry = TranscriptEntry(
        kind="roll_prompt",
        id=_entry_id(),
        timestamp=time.time(),
        pending_action=pending,
    )
    session.transcript.append(entry)
    return entry


def append_roll_result(
    session: Session,
    result: RollResultPayload,
) -> TranscriptEntry:
    entry = TranscriptEntry(
        kind="roll_result",
        id=_entry_id(),
        timestamp=time.time(),
        roll_result=result,
    )
    session.transcript.append(entry)
    return entry


def append_rest(session: Session, text: str) -> TranscriptEntry:
    entry = TranscriptEntry(
        kind="rest",
        id=_entry_id(),
        timestamp=time.time(),
        text=text,
    )
    session.transcript.append(entry)
    return entry


def append_item(session: Session, text: str) -> TranscriptEntry:
    entry = TranscriptEntry(
        kind="item",
        id=_entry_id(),
        timestamp=time.time(),
        text=text,
    )
    session.transcript.append(entry)
    return entry
