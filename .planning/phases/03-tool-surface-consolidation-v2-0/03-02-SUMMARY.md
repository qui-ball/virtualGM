---
phase: 03-tool-surface-consolidation-v2-0
plan: 02
subsystem: backend (golden-path smoke gate)
tags: [smoke-test, human-verify, sse, invariant]
requires:
  - "Plan 03-01 consolidated tool surface (modify_inventory, set_countdown, apply_damage(is_boss), _check_level_up, set_boss_battle retired)"
provides:
  - "Human-verified golden-path UI smoke result (INV-01/INV-02)"
  - "CLI session bootstrap + tool-surface assertion smoke (INV-03)"
affects: []
tech-stack:
  added: []
  patterns:
    - "End-of-phase human-verify checkpoint gates the consolidated tool surface against the live UI"
key-files:
  created:
    - ".planning/phases/03-tool-surface-consolidation-v2-0/03-02-SUMMARY.md"
  modified: []
decisions:
  - "No code changes — this plan is verification-only (files_modified empty)"
  - "Live 'accepts a turn' CLI smoke deferred to the human golden-path (which exercises the same backend for real); automated CLI portion limited to session bootstrap + agent/tool wiring to avoid burning API tokens"
---

# Summary: 03-02 — End-of-phase golden-path smoke gate

## What was verified

**Task 1 — CLI smoke + automated assertions (INV-03, INV-04/05):**
- `cli.py` imports and the `gm_agent` constructs cleanly; session bootstrap reproduces `run_chat()` (GameState + `create_player_character` → "Aldric of Corlinn Hill" + campaign dir) without crashing.
- Registered tool count is 14 (<= 14); `modify_inventory` and `set_countdown` present; `set_boss_battle`, `add_to_inventory`, `remove_from_inventory`, `create_countdown`, `update_countdown` all absent.
- `git status` confirms zero edits leaked into `backend_generalist/` or `frontend/` (INV-04), and `backend/api/schemas.py` / `GameState` class shape untouched (INV-05).

**Task 2 — human-verify golden-path UI smoke (INV-01/INV-02): APPROVED.**
The user drove the live FastAPI backend + React frontend through one play session exercising every consolidation point:
- Inventory add then remove (`modify_inventory`).
- Countdown create then modify via absolute-value upsert (`set_countdown`).
- Boss battle via `apply_damage(is_boss=True)` → PC to 0 HP → "Blaze of Glory / Risk It All" branch fired.
- Later non-boss fight after the boss ended (last enemy removed) → PC to 0 HP → Blaze-of-Glory did NOT fire (validates the D-08b `is_boss_battle` auto-clear).
- XP award crossing a threshold → LEVEL UP message via `_check_level_up`.
- Deferred dice-roll round-trip through the dice-prompt UI.
- SSE event types and `game_state` payload field names unchanged; frontend needed zero code edits.

## Outcome

Phase 3's hard contract holds: the tool surface shrank 17 → 14 with no dropped in-fiction capability and a byte-compatible SSE wire format. INV-01, INV-02, INV-03 verified for Phase 3.

## Self-Check: PASSED
