"""Resolve live sessions with soft-account ownership (Feature 07)."""

from __future__ import annotations

from fastapi import HTTPException, Header
from typing import Annotated

from api.accounts import account_exists
from catalog.playthrough_store import playthrough_store
from game.session import Session, store


def resolve_account_header(
    x_account_id: Annotated[str | None, Header(alias="X-Account-Id")] = None,
) -> str | None:
    """Optional soft account — validated when present."""
    if not x_account_id or not x_account_id.strip():
        return None
    aid = x_account_id.strip()
    if not account_exists(aid):
        raise HTTPException(status_code=401, detail="Unknown account")
    return aid


def get_owned_session(session_id: str, account_id: str | None) -> Session:
    """Return the live session, enforcing playthrough ownership when linked.

    Legacy sessions (no playthrough) stay reachable for CLI / empty-body creates.
    Playthrough-backed sessions require a matching ``X-Account-Id``.
    """
    session = store.get(session_id)
    if session is None:
        raise HTTPException(status_code=404, detail="Session not found")

    pt = playthrough_store.find_by_session_id(session_id)
    if pt is None:
        return session

    if not account_id:
        raise HTTPException(
            status_code=401,
            detail="X-Account-Id header required",
        )
    if pt.owner_id != account_id:
        raise HTTPException(status_code=404, detail="Session not found")
    return session
