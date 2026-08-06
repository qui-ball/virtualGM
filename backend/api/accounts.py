"""Soft accounts API (Feature 07) — display-name only, no credentials."""

from __future__ import annotations

import re
import uuid
from datetime import datetime, timezone
from typing import Annotated

from fastapi import APIRouter, Header, HTTPException
from pydantic import BaseModel, Field

from catalog import persistence as persist
from supabase_client import get_supabase_service_client, is_supabase_configured

router = APIRouter(tags=["accounts"])

# Seeded soft accounts (match supabase/seed.sql) — used when Supabase is unavailable.
SEEDED_ACCOUNTS: list[dict] = [
    {
        "id": "c0000002-0000-4000-8000-000000000001",
        "display_name": "Qui",
        "created_at": "2026-01-01T00:00:00+00:00",
    },
    {
        "id": "c0000002-0000-4000-8000-000000000002",
        "display_name": "Bilun",
        "created_at": "2026-01-01T00:00:00+00:00",
    },
]

# In-memory registry for tests / file mode (includes seed + runtime creates).
_memory_accounts: dict[str, dict] = {a["id"]: dict(a) for a in SEEDED_ACCOUNTS}


class AccountSummary(BaseModel):
    id: str
    display_name: str
    created_at: str | None = None


class AccountsResponse(BaseModel):
    accounts: list[AccountSummary]


class CreateAccountRequest(BaseModel):
    display_name: str = Field(min_length=1, max_length=100)


class CreateAccountResponse(BaseModel):
    id: str
    display_name: str
    created_at: str | None = None


def _slug_email(display_name: str, user_id: str) -> str:
    base = re.sub(r"[^a-z0-9]+", "-", display_name.strip().lower()).strip("-") or "player"
    return f"{base}-{user_id[:8]}@virtualgm.local"


def list_accounts_rows() -> list[dict]:
    if is_supabase_configured() and persist.persistence_mode() == "supabase":
        try:
            client = get_supabase_service_client()
            res = (
                client.table("users")
                .select("id,display_name,created_at")
                .order("display_name")
                .execute()
            )
            return list(res.data or [])
        except Exception:
            pass
    return sorted(_memory_accounts.values(), key=lambda a: a["display_name"].lower())


def account_exists(account_id: str) -> bool:
    if not account_id:
        return False
    if is_supabase_configured() and persist.persistence_mode() == "supabase":
        try:
            client = get_supabase_service_client()
            res = (
                client.table("users")
                .select("id")
                .eq("id", account_id)
                .limit(1)
                .execute()
            )
            return bool(res.data)
        except Exception:
            return account_id in _memory_accounts
    return account_id in _memory_accounts


def require_account_id(
    x_account_id: Annotated[str | None, Header(alias="X-Account-Id")] = None,
) -> str:
    """FastAPI dependency: resolve soft account from header."""
    if not x_account_id or not x_account_id.strip():
        raise HTTPException(
            status_code=401,
            detail="X-Account-Id header required",
        )
    aid = x_account_id.strip()
    try:
        uuid.UUID(aid)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail="Invalid X-Account-Id") from exc
    if not account_exists(aid):
        raise HTTPException(status_code=401, detail="Unknown account")
    return aid


@router.get("/accounts", response_model=AccountsResponse)
def get_accounts():
    rows = list_accounts_rows()
    return AccountsResponse(
        accounts=[
            AccountSummary(
                id=str(r["id"]),
                display_name=str(r.get("display_name") or ""),
                created_at=str(r["created_at"]) if r.get("created_at") else None,
            )
            for r in rows
            if r.get("display_name")
        ]
    )


@router.post("/accounts", response_model=CreateAccountResponse)
def create_account(body: CreateAccountRequest):
    name = body.display_name.strip()
    if not name:
        raise HTTPException(status_code=400, detail="display_name is required")

    for row in list_accounts_rows():
        if str(row.get("display_name") or "").strip().lower() == name.lower():
            raise HTTPException(
                status_code=409,
                detail=f"Account name already exists: {name}",
            )

    user_id = str(uuid.uuid4())
    auth_id = str(uuid.uuid4())
    email = _slug_email(name, user_id)
    created_at = datetime.now(timezone.utc).isoformat()

    if is_supabase_configured() and persist.persistence_mode() == "supabase":
        try:
            client = get_supabase_service_client()
            # Minimal auth.users row via RPC-less insert (service role).
            client.schema("auth").table("users").insert(
                {
                    "id": auth_id,
                    "instance_id": "00000000-0000-0000-0000-000000000000",
                    "aud": "authenticated",
                    "role": "authenticated",
                    "email": email,
                    "encrypted_password": "",
                    "email_confirmed_at": created_at,
                    "raw_app_meta_data": {"provider": "email", "providers": ["email"]},
                    "raw_user_meta_data": {"display_name": name},
                    "created_at": created_at,
                    "updated_at": created_at,
                }
            ).execute()
            client.table("users").insert(
                {
                    "id": user_id,
                    "supabase_user_id": auth_id,
                    "email": email,
                    "display_name": name,
                }
            ).execute()
        except Exception as exc:
            # Fall back to memory if auth insert shape differs across local versions.
            _memory_accounts[user_id] = {
                "id": user_id,
                "display_name": name,
                "created_at": created_at,
            }
            # Prefer surfacing DB errors when supabase mode expected
            if "duplicate" in str(exc).lower() or "unique" in str(exc).lower():
                raise HTTPException(
                    status_code=409,
                    detail=f"Account name already exists: {name}",
                ) from exc
            # Keep memory account so POC continues
            return CreateAccountResponse(
                id=user_id, display_name=name, created_at=created_at
            )
    else:
        _memory_accounts[user_id] = {
            "id": user_id,
            "display_name": name,
            "created_at": created_at,
        }

    return CreateAccountResponse(id=user_id, display_name=name, created_at=created_at)


def reset_memory_accounts_for_tests() -> None:
    """Test helper: restore seeded soft accounts only."""
    _memory_accounts.clear()
    for a in SEEDED_ACCOUNTS:
        _memory_accounts[a["id"]] = dict(a)
