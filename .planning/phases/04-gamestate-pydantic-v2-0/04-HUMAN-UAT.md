---
status: partial
phase: 04-gamestate-pydantic-v2-0
source: [04-01-PLAN.md (Task 3 checkpoint:human-verify)]
started: 2026-05-22T13:06:17Z
updated: 2026-05-22T13:06:17Z
---

## Current Test

[awaiting human testing]

## Tests

### 1. CLI smoke (INV-03)
expected: From `backend/`, start the CLI (`python -m backend.cli` or the documented entry); a session starts and one turn is accepted without crashing. `list(game_state.narrations)` access at cli.py:131 still works (no AttributeError).
result: [pending]

### 2. Web UI deferred-dice golden path (INV-01/INV-02)
expected: Start the FastAPI app + React frontend. Submit a turn that includes a deferred dice-roll round-trip so BOTH a `pending_action` and a `complete` SSE event fire. The dice prompt appears, the turn completes, and game state (character HP/conditions, enemies, countdowns, in_combat) renders correctly. Frontend was NOT changed.
result: [pending]

### 3. Byte-compat SSE spot check (INV-01, success criterion #3)
expected: In browser devtools (Network/EventStream) or via logging, inspect the `game_state` object inside a `pending_action` and a `complete` SSE event. It has exactly keys `character`, `enemies`, `countdowns`, `in_combat` — with `character` (not `pc`). No new keys, no `narrations`, no `_event_queue`.
result: [pending]

## Summary

total: 3
passed: 0
issues: 0
pending: 3
skipped: 0
blocked: 0

## Gaps
