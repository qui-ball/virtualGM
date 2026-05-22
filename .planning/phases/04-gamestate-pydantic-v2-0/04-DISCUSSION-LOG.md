# Phase 4: gamestate-pydantic (v2.0) - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-05-21
**Phase:** 4-gamestate-pydantic-v2-0
**Areas discussed:** Snapshot shape & return type, Runtime field handling, Validation posture, recording.py disposition

---

## Snapshot shape & return type

| Option | Description | Selected |
|--------|-------------|----------|
| Hand-built dict | `.snapshot()` returns an explicit dict (today's `_snapshot` body moved into the model). Mirror fully gone, no magic. turn_engine calls `.snapshot()` directly — minor deviation from roadmap's `.model_dump()` wording. | ✓ |
| Dict via serialization alias | `self.model_dump(by_alias=True, include={pc,enemies,countdowns,in_combat})` with pc aliased to character. Leverages pydantic; adds a serialization_alias side-effect on pc. | |
| Relocate a small model | Keep a tiny snapshot BaseModel in models.py; turn_engine keeps `.snapshot().model_dump()` (matches roadmap verbatim). Con: arguably just moves the mirror. | |

**User's choice:** Hand-built dict (recommended default accepted).
**Notes:** Pre-discussion clarification: user asked what `GameStateSnapshot` was; confirmed understanding of the parallel-mirror problem before deciding. Roadmap-wording deviation will be flagged in CONTEXT.md (Phase-3 habit).

---

## Runtime field handling

| Option | Description | Selected |
|--------|-------------|----------|
| Field(exclude=True) + PrivateAttr | narrations stays a public field with exclude=True (no rename, zero call-site churn); _event_queue becomes a PrivateAttr. STATE-01 allows 'PrivateAttr or equivalent.' | ✓ |
| Both PrivateAttr | Rename narrations → _narrations PrivateAttr; update turn_engine.py:86 + cli.py:131. More literal to STATE-01 wording, touches more files. | |

**User's choice:** Field(exclude=True) + PrivateAttr (recommended default accepted).
**Notes:** Lowest blast radius; keeps `gs.narrations` working everywhere.

---

## Validation posture

| Option | Description | Selected |
|--------|-------------|----------|
| Plain BaseModel | Validate at construction only; in-place mutation behaves like today's plain class. Lowest churn/risk. | ✓ |
| validate_assignment=True | Validate on every attribute assignment. Leans into 'schema-enforced' value but adds regression risk and wouldn't catch in-place dict mutations anyway. | |

**User's choice:** Plain BaseModel (recommended default accepted).

---

## recording.py disposition

| Option | Description | Selected |
|--------|-------------|----------|
| Leave untouched | Different full-state shape, off the SSE path, outside STATE-01/02/03 scope. Keeps the diff tight. | ✓ |
| Refactor onto new model | Replace hand-built dict with GameState.model_dump(). Cleaner but expands scope and risks changing recorder output shape. | |

**User's choice:** Leave untouched (recommended default accepted).

---

## Claude's Discretion

- No-arg construction defaults so `GameState()` keeps working at all three call sites.
- `.snapshot()` as an instance method; field/PrivateAttr declaration placement and ordering.

## Deferred Ideas

- `validate_assignment=True` / stronger mutation enforcement — future hardening pass.
- Refactoring `recording.py:_serialize_game_state` onto the new BaseModel — future reconciliation.

## Discovered during discussion (not a gray area)

- `TurnResponse` (schemas.py:45) is dead code and the only other reference to `GameStateSnapshot`. Deleting it is required to satisfy success criterion #1 without leaving a dangling reference. Captured in CONTEXT.md code_context.
