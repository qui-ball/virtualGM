"""Server-side Supabase client (secret or service_role key only).

The Supabase Python client created here uses ``SUPABASE_SECRET_KEY`` or
``SUPABASE_SERVICE_ROLE_KEY``. That key **bypasses RLS** — use this module only
for trusted backend operations (admin, migrations helpers, GM-only writes).

End users and the browser must use the anon/publishable client; never put the
secret/service_role in ``VITE_*`` or frontend code.

Environment variables (root ``.env.development`` or Compose — see ``.env.example``):

- ``SUPABASE_URL`` — project URL
- ``SUPABASE_SECRET_KEY`` *or* ``SUPABASE_SERVICE_ROLE_KEY`` — exactly one must be set
"""

from __future__ import annotations

import os
from functools import lru_cache

from supabase import Client, create_client


def _normalize_url(url: str) -> str:
    return url.strip().rstrip("/")


def require_supabase_url() -> str:
    """Return configured project URL or raise if missing."""
    url = os.getenv("SUPABASE_URL", "")
    if not url.strip():
        raise RuntimeError(
            "SUPABASE_URL is not set. Add it to the root .env (see .env.example)."
        )
    return _normalize_url(url)


def require_supabase_service_key() -> str:
    """Return secret or legacy service_role JWT; raise if neither is set."""
    secret = (os.getenv("SUPABASE_SECRET_KEY") or "").strip()
    if secret:
        return secret
    legacy = (os.getenv("SUPABASE_SERVICE_ROLE_KEY") or "").strip()
    if legacy:
        return legacy
    raise RuntimeError(
        "No Supabase service key: set SUPABASE_SECRET_KEY or "
        "SUPABASE_SERVICE_ROLE_KEY (backend only — never in frontend env)."
    )


@lru_cache(maxsize=1)
def get_supabase_service_client() -> Client:
    """Singleton client using the elevated key. **Bypasses RLS.**

    Call from backend code that must read/write across tenants or run as admin.
    For user-scoped access mirroring the browser, prefer PostgREST with the
    user's JWT instead (not implemented here).
    """
    url = require_supabase_url()
    key = require_supabase_service_key()
    return create_client(url, key)


def is_supabase_configured() -> bool:
    """True when URL and at least one service key env var are non-empty."""
    try:
        require_supabase_url()
        require_supabase_service_key()
    except RuntimeError:
        return False
    return True


def reset_supabase_client_cache() -> None:
    """Clear the cached client (e.g. in tests after changing os.environ)."""
    get_supabase_service_client.cache_clear()
