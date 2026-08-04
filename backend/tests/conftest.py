"""Pytest defaults for Virtual GM backend."""

import os

# Prefer seed-mirrored static catalog — avoids slow Supabase timeouts in CI/dev.
os.environ.setdefault("VIRTUALGM_USE_STATIC_CATALOG", "1")
os.environ.setdefault("VIRTUALGM_PLAYTHROUGH_STORE", "memory")

from catalog.playthrough_store import playthrough_store  # noqa: E402


def pytest_runtest_setup():
    playthrough_store.clear()
