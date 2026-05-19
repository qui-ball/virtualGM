# virtualGM — Solo TTRPG GM Agent

## What This Is

virtualGM is a solo tabletop RPG GM agent built on `pydantic-ai`, fronted by a small React/Vite chat UI talking to a FastAPI/SSE backend.

Two backends coexist in the repo:

- **`backend/`** — the live, Pydantic-typed production stack. Strict schemas (`CharacterState`, `EnemyState`, `GameState`), ~15 domain-specific tools (`narrate`, `apply_damage`, `ask_player_roll`, `load_campaign_section`, …), FastAPI app with SSE streaming, deferred-tool dice prompts wired into the web UI.
- **`backend_generalist/`** — a parallel viability spike (v1.0, complete). Replaced the domain-tool layer with generic primitives (Read, Write, Edit, Glob, Bash) over a per-session JSON world directory. Verdict: pattern works (`play passed`), but ad-hoc JSON state without schema enforcement is unsuitable for the production stack.

## Core Value

Ship a maintainable, schema-enforced TTRPG GM agent backend that drives the existing web UI without ad-hoc tool sprawl or duplicated state surfaces. `backend/` is the production target; `backend_generalist/` stays archived as a viability reference.

## Current Milestone: v2.0 backend-simplification

**Goal:** Cut duplication, prompt overhead, tool-surface bloat, and parallel-mirror state in `backend/` while preserving strict Pydantic schemas and the existing FastAPI/SSE wire format the frontend depends on.

**Target outcomes:**

- Single shared SSE turn-stream function in `api/turn_engine.py` (no `stream_turn` vs `stream_deferred_response` near-duplicate).
- System prompt no longer re-describes each tool's signature; relies on pydantic-ai docstrings. Static ruleset embedded at module-load, not re-injected per turn.
- Tool surface trimmed from ~15 → ~10 by merging the inventory pair, the countdown pair, retiring `set_boss_battle`, factoring level-up out of `award_xp`, and replacing manual section load/unload + 3-section cap with implicit LRU.
- `GameState` becomes a Pydantic `BaseModel` exposing `.snapshot()`; the hand-maintained `GameStateSnapshot` mirror in `api/schemas.py` is removed.

## Requirements

### Validated

<!-- v1.0 viability spike — completed 2026-04-28, verdict `play passed`. Frozen as historical reference. -->

- ✓ pydantic-ai agent with 5 generic primitives only (Read/Write/Edit/Glob/Bash) — `backend_generalist/` (v1.0)
- ✓ Per-session world directory bootstrapped from template — `backend_generalist/template_world/` + `world.py` (v1.0)
- ✓ CLI turn loop over stdin/stdout with state preserved on Ctrl-C — `backend_generalist/cli.py` (v1.0)
- ✓ End-to-end coherent solo TTRPG play with no domain tools — human-verified across 7 sessions (v1.0)
- ✓ Live production stack: ~15 domain tools, strict Pydantic schemas, FastAPI + SSE, deferred-tool web dice — `backend/` (pre-existing)
- ✓ React/Vite chat UI consuming SSE turn stream + dice-roll prompt — `frontend/` (pre-existing)

### Active

<!-- Scope of this milestone (v2.0). REQ-IDs and full criteria live in REQUIREMENTS.md. -->

- [ ] De-duplicate `api/turn_engine.py` SSE stream functions into one shared core
- [ ] Trim agent system prompt to behavior/pacing rules only; rely on tool docstrings for signatures
- [ ] Embed static ruleset at module load instead of per-turn `@gm_agent.instructions`
- [ ] Audit and consolidate duplicated test files (`agent_test.py` vs `test_agent.py`)
- [ ] Merge inventory tool pair into one tool
- [ ] Merge countdown tool pair into one tool
- [ ] Retire `set_boss_battle` (fold into `apply_damage` or scene state)
- [ ] Factor level-up logic out of `award_xp` into a non-tool helper
- [ ] Replace manual `load/unload_campaign_section` + 3-section cap with implicit LRU caching
- [ ] Promote `GameState` to a Pydantic `BaseModel` with a `.snapshot()` method
- [ ] Remove the `GameStateSnapshot` mirror in `api/schemas.py`; emit `GameState.snapshot()` directly over SSE

### Out of Scope

- Any change to `backend_generalist/` — archived as v1.0 reference
- Any change to the SSE wire format the frontend consumes (`narration`, `thinking`, `pending_action`, `complete`, `error` events; field names within them) — frontend stays untouched
- Any change to `CharacterState`, `EnemyState`, or other existing Pydantic schemas — only `GameState`'s plain-class status changes
- Adding new gameplay features, new rulesets, or new campaigns
- Frontend changes — UI is in scope only as the smoke-test consumer for verifying no regressions
- Migrating any session state from `backend/` to `backend_generalist/` or vice versa
- Production hardening (auth, rate limiting, telemetry) — orthogonal to simplification

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
| `backend/` is the production target, not `backend_generalist/` | Strict schemas catch invalid state and make the API contract checkable; the spike's "world as ad-hoc JSON" is the wrong trade for the live UI | — Pending validation in v2.0 |
| Simplify in-place rather than re-port from generalist | Generalist's tool surface and prompt shape are useful lessons, not a target replacement; `backend/` already has the schema discipline we want | — Pending validation in v2.0 |
| Three phases (Tier 2 → Tier 3 → Tier 4) in sequence | Each tier is independently verifiable against the same frontend smoke test; staging keeps blast radius small | — Pending validation in v2.0 |

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
*Last updated: 2026-05-19 — opened milestone v2.0 backend-simplification.*
