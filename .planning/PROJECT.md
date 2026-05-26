# virtualGM — Solo TTRPG GM Agent

## What This Is

virtualGM is a solo tabletop RPG GM agent built on `pydantic-ai`, fronted by a small React/Vite chat UI talking to a FastAPI/SSE backend.

The repo has one backend:

- **`backend/`** — the live, Pydantic-typed production stack. Strict schemas (`CharacterState`, `EnemyState`, and as of v2.0 a Pydantic-`BaseModel` `GameState` with `.snapshot()`), 14 domain-specific tools (`narrate`, `apply_damage`, `ask_player_roll`, `load_campaign_section`, …), a single shared SSE turn-stream core, FastAPI app with SSE streaming, deferred-tool dice prompts wired into the web UI. Simplified in v2.0 (de-dup, tool-surface consolidation, state-model unification) with the frontend wire format held byte-compatible.
- **`backend_generalist/`** — a parallel viability spike (v1.0, complete), since **removed** from the repo. It replaced the domain-tool layer with generic primitives (Read, Write, Edit, Glob, Bash) over a per-session JSON world directory. Verdict: pattern works (`play passed`), but ad-hoc JSON state without schema enforcement is unsuitable for the production stack — so the direction is to simplify `backend/`'s domain tools rather than adopt the generic harness. Code recoverable from git history.

## Core Value

Ship a maintainable, schema-enforced TTRPG GM agent backend that drives the existing web UI without ad-hoc tool sprawl or duplicated state surfaces. `backend/` is the production target; the `backend_generalist/` spike concluded and was removed (recoverable from git history).

## Current State

**v2.0 backend-simplification — SHIPPED 2026-05-26.** `backend/` now has one shared SSE turn-stream core, a trimmed system prompt with a statically-embedded ruleset, a tool surface reduced 17 → 14, and a unified Pydantic-`BaseModel` `GameState` with `.snapshot()` (the `GameStateSnapshot` mirror and dead `TurnResponse` are gone). The frontend SSE wire format was held byte-compatible throughout (human-verified golden-path deferred-dice turns after each phase, plus an automated byte-compat regression test in Phase 4). One target outcome was deliberately descoped: implicit-LRU section caching (TOOLS-05) — manual `load/unload_campaign_section` with the 3-section cap remains.

## Next Milestone Goals

No milestone is currently active. Candidate directions carried forward as a hardening backlog (orthogonal to simplification): atomic JSON writes, session-log persistence, agent-action quotas, and the deferred implicit-LRU section caching (TOOLS-05). Start the next milestone with `/gsd-new-milestone`.

## Requirements

### Validated

<!-- v1.0 viability spike — completed 2026-04-28, verdict `play passed`. Frozen as historical reference. -->

- ✓ pydantic-ai agent with 5 generic primitives only (Read/Write/Edit/Glob/Bash) — `backend_generalist/` (v1.0)
- ✓ Per-session world directory bootstrapped from template — `backend_generalist/template_world/` + `world.py` (v1.0)
- ✓ CLI turn loop over stdin/stdout with state preserved on Ctrl-C — `backend_generalist/cli.py` (v1.0)
- ✓ End-to-end coherent solo TTRPG play with no domain tools — human-verified across 7 sessions (v1.0)
- ✓ Live production stack: domain tools, strict Pydantic schemas, FastAPI + SSE, deferred-tool web dice — `backend/` (pre-existing)
- ✓ React/Vite chat UI consuming SSE turn stream + dice-roll prompt — `frontend/` (pre-existing)

<!-- v2.0 backend-simplification — shipped 2026-05-26. Archived criteria: milestones/v2.0-REQUIREMENTS.md. -->

- ✓ De-duplicated `api/turn_engine.py` SSE stream functions into one shared `_stream_core` — v2.0 (Phase 2)
- ✓ Trimmed agent system prompt to behavior/pacing rules; relies on tool docstrings for signatures — v2.0 (Phase 2)
- ✓ Static ruleset embedded at module load instead of per-turn `@gm_agent.instructions` — v2.0 (Phase 2)
- ✓ Consolidated duplicated test files (`agent_test.py` vs `test_agent.py`) — v2.0 (Phase 2)
- ✓ Merged inventory tool pair into one tool — v2.0 (Phase 3)
- ✓ Merged countdown tool pair into one tool — v2.0 (Phase 3)
- ✓ Retired `set_boss_battle` (relocated onto `apply_damage(is_boss=True)` + auto-clear) — v2.0 (Phase 3)
- ✓ Factored level-up logic out of `award_xp` into a non-tool helper — v2.0 (Phase 3)
- ✓ Promoted `GameState` to a Pydantic `BaseModel` with `.snapshot()` — v2.0 (Phase 4)
- ✓ Removed the `GameStateSnapshot` mirror; emit `GameState.snapshot()` directly over SSE (byte-identical, D-02) — v2.0 (Phase 4)

### Active

(None — no milestone currently active. See Next Milestone Goals.)

### Out of Scope

- Any change to `backend_generalist/` — archived as v1.0 reference
- Any change to the SSE wire format the frontend consumes (`narration`, `thinking`, `pending_action`, `complete`, `error` events; field names within them) — frontend stays untouched
- Any change to `CharacterState`, `EnemyState`, or other existing Pydantic schemas — only `GameState`'s plain-class status changes
- Adding new gameplay features, new rulesets, or new campaigns
- Frontend changes — UI is in scope only as the smoke-test consumer for verifying no regressions
- Migrating any session state from `backend/` to `backend_generalist/` or vice versa
- Production hardening (auth, rate limiting, telemetry) — orthogonal to simplification
- Implicit-LRU section caching (TOOLS-05) — **descoped from v2.0** (D-09): manual `load/unload_campaign_section` + 3-section cap retained; revisit in a future milestone if needed

## Context

- **Brownfield:** `backend/` is live and works; users are running real sessions through the FastAPI/web UI. v2.0 is internal cleanup, not a rewrite.
- **Why now:** v1.0 viability spike answered "can a generalist coding-agent harness GM a TTRPG?" with YES. But strict schemas catch class-invalid state at boundaries and make the API surface contract-checkable — that's worth keeping. The right next move is to *carry the lessons from the spike* (smaller tool surface, less prompt overhead, less mirrored state) back into `backend/` without dropping schemas.
- **Frontend contract is the invariant:** the React UI's chat + dice-prompt flow depends on specific SSE event types and the deferred-tool round-trip. Every refactor must preserve that contract verbatim.

## Constraints

- **Tech stack:** `pydantic-ai`, FastAPI, OpenRouter — unchanged.
- **Schemas:** `CharacterState`, `EnemyState`, etc. stay as Pydantic models with their current fields. Only `GameState`'s plain-class shape changes (Tier 4).
- **Wire format:** SSE event types, payload field names, and `PendingAction` schema MUST remain byte-compatible with the existing frontend client.
- **Tool-surface reductions:** must preserve every existing in-fiction capability — merging two tools is fine, but no capability may quietly disappear.
- **Verification:** existing CLI + web UI smoke test must pass after each phase. No new test infrastructure required, but no regressions either.

## Key Decisions

| Decision | Rationale | Outcome |
|----------|-----------|---------|
| Parallel `backend_generalist/` for v1.0 viability spike | Keep live `backend/` untouched while experimenting | ✓ Validated 2026-04-28 (`play passed`) |
| Full Bash in generalist harness | Faithful coding-agent harness; max viability signal | ✓ Validated 2026-04-28 |
| `backend/` is the production target, not `backend_generalist/` | Strict schemas catch invalid state and make the API contract checkable; the spike's "world as ad-hoc JSON" is the wrong trade for the live UI | ✓ Validated v2.0 — schemas kept and extended (GameState typed) with no regressions |
| Simplify in-place rather than re-port from generalist | Generalist's tool surface and prompt shape are useful lessons, not a target replacement; `backend/` already has the schema discipline we want | ✓ Validated v2.0 — three in-place tiers shipped, frontend untouched |
| Three phases (Tier 2 → Tier 3 → Tier 4) in sequence | Each tier is independently verifiable against the same frontend smoke test; staging keeps blast radius small | ✓ Validated v2.0 — each phase smoke-tested independently |
| Tool-count baseline corrected 17 → ≤14 (D-10), no over-merging | Roadmap's "~15 → ≤11" anchored to a wrong baseline; only named consolidations applied | ✓ Good — landed at exactly 14 |
| Boss flag relocated, not removed (D-07/D-08) | `is_boss_battle` field kept; write moved onto `apply_damage(is_boss=True)`, auto-cleared on last-enemy removal | ✓ Good |
| TOOLS-05 implicit-LRU section caching descoped (D-09) | Avoid a silent verification gap; manual load/unload + 3-section cap is adequate for now | — Deferred to a future milestone |
| `GameState.snapshot()` returns a hand-built plain dict, called directly with no `.model_dump()` (D-01/D-02) | One source of truth; output proven byte-identical to the old mirror | ✓ Good — pinned by an automated byte-compat test |
| Runtime fields excluded from serialization: `narrations` `Field(exclude=True)`, `_event_queue` `PrivateAttr` (D-03/D-04); no `validate_assignment` (D-05) | Keep the wire format clean and preserve plain-class in-place mutation semantics | ✓ Good |

## Evolution

This document evolves at phase transitions and milestone boundaries.

**After each phase transition** (via `/gsd-transition`):
1. Requirements invalidated? → Move to Out of Scope with reason
2. Requirements validated? → Move to Validated with phase reference
3. New requirements emerged? → Add to Active
4. Decisions to log? → Add to Key Decisions
5. "What This Is" still accurate? → Update if drifted

**After each milestone** (via `/gsd:complete-milestone`):
1. Full review of all sections
2. Core Value check — still the right priority?
3. Audit Out of Scope — reasons still valid?
4. Update Context with current state

---
*Last updated: 2026-05-26 — after v2.0 backend-simplification milestone.*
