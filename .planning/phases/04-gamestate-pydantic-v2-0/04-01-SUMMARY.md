---
phase: 04-gamestate-pydantic-v2-0
plan: 01
subsystem: backend-state-model
tags: [pydantic, basemodel, sse, refactor, state-unification]
requires: []
provides:
  - "GameState as a Pydantic BaseModel with .snapshot()"
  - "SSE game_state payload sourced from GameState.snapshot() (single source of truth)"
affects:
  - backend/game/models.py
  - backend/api/turn_engine.py
  - backend/api/schemas.py
tech-stack:
  added: [pytest (dev-dependency)]
  patterns:
    - "Pydantic BaseModel field-default idiom (literal default for scalars/Optionals, Field(default_factory=...) for mutable containers)"
    - "Field(exclude=True) for public-but-non-serialized fields"
    - "PrivateAttr for runtime-only non-serializable attributes"
    - "Hand-built dict snapshot reproducing a field rename for wire byte-compat"
key-files:
  created:
    - backend/game/test_models.py
  modified:
    - backend/game/models.py
    - backend/api/turn_engine.py
    - backend/api/schemas.py
    - backend/pyproject.toml
    - backend/uv.lock
decisions:
  - "D-02 (flagged ROADMAP deviation): turn_engine calls session.game_state.snapshot() directly with NO trailing .model_dump(); snapshot() already returns a plain dict and output is byte-identical to the old GameStateSnapshot(...).model_dump()."
  - "D-01: snapshot() builds the four-key dict by hand (no second model class)."
  - "D-03/D-04: narrations uses Field(exclude=True) keeping its public name; _event_queue is a PrivateAttr — neither leaks to serialization."
  - "D-05: no validate_assignment so in-place mutation behaves like the old plain class."
  - "Added pytest as a dev dependency (Rule 3) — the plan's <verify> blocks invoke `python -m pytest` but pytest was not previously installed."
metrics:
  duration: ~12 min
  completed: 2026-05-22
  tasks_completed: 2 of 3 (Task 3 human-verify deferred to end-of-phase HUMAN-UAT)
---

# Phase 4 Plan 01: gamestate-pydantic Summary

GameState is now a Pydantic `BaseModel` exposing `.snapshot()`; the duplicated `GameStateSnapshot` mirror (and dead `TurnResponse`) in `api/schemas.py` are deleted, and `turn_engine` emits `session.game_state.snapshot()` directly into both SSE events — collapsing the dual state surface into one schema-enforced source of truth while keeping the wire format byte-identical for the untouched frontend.

## What Was Built

### Task 1 — Promote GameState to a Pydantic BaseModel with .snapshot() (TDD)
- Converted `class GameState:` → `class GameState(BaseModel)` in `backend/game/models.py`, replacing the `__init__` body with class-level field declarations that mirror the prior field set exactly (names, types, inline comments preserved). Every field has a default so no-arg `GameState()` keeps working at `cli.py:43`, `session.py:37`, `app.py:45`.
- `narrations: list[str] = Field(default_factory=list, exclude=True)` (D-03) — public name retained so call sites at `turn_engine.py:86` and `cli.py:131` are untouched; excluded from serialization.
- `_event_queue: asyncio.Queue | None = PrivateAttr(default=None)` (D-04) — runtime-only, never serialized; no `arbitrary_types_allowed` needed.
- No `validate_assignment` (D-05) — in-place mutation (`gs.pc=`, `gs.enemies[k]=`, `del`, `gs.countdowns[k]=`, `gs.in_combat=`, `gs.narrations.append`, `gs._event_queue=`) behaves like the old plain class.
- Added `snapshot(self) -> dict` (D-01): a hand-built four-key dict — `character` (= `self.pc.model_dump() if self.pc else None`, reproducing the `pc`→`character` rename), `enemies` (`{k: v.model_dump()}`), `countdowns`, `in_combat`.
- Created `backend/game/test_models.py` (9 tests): BaseModel subclass, no-arg defaults, four-key snapshot shape, `pc`→`character` rename, enemies-by-id serialization, countdowns/in_combat passthrough, **non-empty** narrations + `_event_queue` absent from both `model_dump()` and `snapshot()`, in-place mutation does not raise. RED (7 failing) → GREEN (9 passing).

### Task 2 — Repoint turn_engine to GameState.snapshot() and delete the schemas mirror
- Deleted `turn_engine._snapshot()`; dropped `GameStateSnapshot` from its import (kept `PendingAction`); repointed both SSE call sites (`pending_action` and `complete`) to `session.game_state.snapshot()`.
- Deleted `class GameStateSnapshot` and dead `class TurnResponse` from `api/schemas.py`; pruned now-unused imports (`Field`, `CharacterState`, `EnemyState`, `ConditionName`); kept `BaseModel` and `DiceType` (used by `PendingAction`).

## Deviations from Plan

### Flagged ROADMAP deviation (carried from plan design)

**D-02 — direct `.snapshot()` call, no `.model_dump()`**
- ROADMAP STATE-03 reads "SSE payloads emit `GameState.snapshot().model_dump()`". Per D-01, `.snapshot()` returns a **plain dict** built by hand, so `turn_engine` calls `.snapshot()` directly — there is NO trailing `.model_dump()`.
- The emitted JSON is **byte-identical**; only the literal call form differs. Verified by reconstructing the old `GameStateSnapshot(...).model_dump()` output and asserting `json.dumps(new, sort_keys=True) == json.dumps(old, sort_keys=True)` for a populated state (pc + enemy + countdown + in_combat).
- This deviation is intentional and was flagged in the plan objective; recorded here for downstream auditability.

### Auto-fixed (Rule 3 — blocking issue)

**1. [Rule 3] Added pytest as a dev dependency**
- **Found during:** Task 1 RED phase.
- **Issue:** The plan's `<verify>` blocks invoke `python -m pytest game/test_models.py`, but `pytest` was not installed in the project's `uv` environment (`ModuleNotFoundError: No module named 'pytest'`), blocking the TDD cycle and verification.
- **Fix:** `uv add --dev pytest` (pytest 9.0.3 + iniconfig + pluggy).
- **Files modified:** `backend/pyproject.toml`, `backend/uv.lock`.
- **Commit:** d899a9c (committed alongside the Task 1 implementation since the verify step depends on it).

No other deviations — the model/turn_engine/schemas changes followed the plan and patterns exactly.

## Verification Results

All automated `<verify>` blocks for Tasks 1 and 2 passed:
- Task 1: `pytest game/test_models.py` → 9 passed; inline assertion (`OK`); `class GameState(BaseModel)` present (`HAS_BASEMODEL`).
- Task 2: `NO_MIRROR`, `NO_TURNRESPONSE`, `TWO_CALLSITES`, `NO_OLD_SNAPSHOT_FN`, `NO_DOUBLE_DUMP_D02`, `IMPORTS_OK`.
- Byte-compat sanity: `snapshot()` output equals the reconstructed old-mirror output for a populated state.
- `recording.py` (D-06) imports cleanly against the new field set; all public attrs it reads still present.
- Scope invariants held: `git diff` since base touches only `backend/api/schemas.py`, `backend/api/turn_engine.py`, `backend/game/models.py`, `backend/game/test_models.py`, `backend/pyproject.toml`, `backend/uv.lock`. No `backend_generalist/` (INV-04), `frontend/` (INV-01), `recording.py` (D-06), or other-model (INV-05) edits.

## Deferred to End-of-Phase HUMAN-UAT (Task 3, checkpoint:human-verify)

`workflow.human_verify_mode` resolves to `end-of-phase`, so Task 3 was NOT halted mid-flight. The following human verification steps are recorded for the end-of-phase HUMAN-UAT flow:

1. **CLI smoke (INV-03):** from `backend/`, start the CLI (`uv run python -m cli` / project's documented entry), confirm a session starts and one turn is accepted without crashing; confirm `list(game_state.narrations)` at `cli.py:131` still works (no AttributeError).
2. **Web UI deferred-dice golden path (INV-01/INV-02):** start the FastAPI app + React frontend; submit a turn including a deferred dice-roll round-trip so BOTH a `pending_action` and a `complete` event fire; confirm the dice prompt appears, the turn completes, and game state (HP/conditions, enemies, countdowns, in_combat) renders correctly with no frontend edits.
3. **Byte-compat SSE spot check:** in devtools EventStream, inspect the `game_state` object inside a `pending_action` and a `complete` event; confirm exactly keys `character`, `enemies`, `countdowns`, `in_combat` — `character` (not `pc`), no `narrations`, no `_event_queue` — matching the pre-phase shape.

Resume signal: "approved" if all three pass; otherwise describe the regression.

## Requirements Addressed (pending end-of-phase human sign-off for INV-01/02/03)

- STATE-01: GameState is a BaseModel; `_event_queue` (PrivateAttr) and `narrations` (exclude=True) never serialized. ✓ (automated)
- STATE-02: `GameState.snapshot()` returns the API-facing view. ✓ (automated)
- STATE-03 (per D-02): `GameStateSnapshot` removed; SSE emits `.snapshot()` directly, byte-identical output. ✓ (automated byte-compat)
- INV-01/INV-02/INV-03: deferred to end-of-phase HUMAN-UAT (web UI + CLI live smoke).
- INV-04/INV-05: `backend_generalist/` and other Pydantic models untouched. ✓ (git diff)

## Commits

- `a5a63f6` test(04-01): add failing tests for GameState BaseModel + snapshot() (RED)
- `d899a9c` feat(04-01): promote GameState to Pydantic BaseModel with snapshot() (GREEN, + pytest dev-dep)
- `5621932` refactor(04-01): emit GameState.snapshot() over SSE, drop schemas mirror

## TDD Gate Compliance

Task 1 followed RED → GREEN: a `test(...)` commit (a5a63f6) precedes the `feat(...)` commit (d899a9c). No separate REFACTOR commit — the GREEN implementation was already minimal and clean.

## Self-Check: PASSED

All claimed files exist (models.py, test_models.py, turn_engine.py, schemas.py, 04-01-SUMMARY.md) and all four commits (a5a63f6, d899a9c, 5621932, 4c526ff) are present in the git log.
