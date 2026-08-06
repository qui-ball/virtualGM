"""Pytest defaults for Virtual GM backend."""

import os

# Prefer seed-mirrored static catalog — avoids slow Supabase timeouts in CI/dev.
os.environ.setdefault("VIRTUALGM_USE_STATIC_CATALOG", "1")
os.environ.setdefault("VIRTUALGM_PLAYTHROUGH_STORE", "memory")
# Agent import requires a key at collection time even when turns are not run.
os.environ.setdefault("OPENROUTER_API_KEY", "sk-test-dummy-for-pytest")

from api.accounts import SEEDED_ACCOUNTS, reset_memory_accounts_for_tests  # noqa: E402
from catalog import transcript_archive as transcript_arch  # noqa: E402
from catalog.playthrough_store import playthrough_store  # noqa: E402

# Soft-account seed used by onboarding / lobby tests (Feature 07).
QUI_ACCOUNT_ID = SEEDED_ACCOUNTS[0]["id"]
ACCOUNT_HEADERS = {"X-Account-Id": QUI_ACCOUNT_ID}


def pytest_runtest_setup():
    playthrough_store.clear()
    reset_memory_accounts_for_tests()
    transcript_arch.clear_memory_archives_for_tests()
