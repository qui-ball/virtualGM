---
gsd_state_version: 1.0
milestone: v2.0
milestone_name: backend-simplification
status: planning
last_updated: "2026-05-19T14:28:52.542Z"
last_activity: 2026-05-19
progress:
  total_phases: 0
  completed_phases: 0
  total_plans: 0
  completed_plans: 0
  percent: 0
---

# State: virtualGM — Solo TTRPG GM Agent

## Project Reference

**Core Value:** Ship a maintainable, schema-enforced TTRPG GM agent backend that drives the existing web UI without ad-hoc tool sprawl or duplicated state surfaces.

**Current Focus:** v2.0 backend-simplification — defining requirements.

**Scope Boundary:** All work targets `backend/`. `backend_generalist/` is archived as v1.0 reference and is NOT modified. `frontend/` SSE wire format is invariant.

## Current Position

Phase: Not started (defining requirements)
Plan: —
Status: Defining requirements
Last activity: 2026-05-19 — Milestone v2.0 started

## Performance Metrics

- **v2.0 Requirements:** TBD (defined during requirements step of new-milestone workflow)
- **Phases:** 0 / TBD
- **Plans:** 0 / TBD

### v1.0 history (preserved)

| Phase-Plan | Tasks | Files | Tests | Duration | Completed |
|------------|-------|-------|-------|----------|-----------|
| 01-01 — sandbox primitive | 2 | 6 | 9/9 passing | ~8 min | 2026-04-28 |
| 01-02 — world template + bootstrap | 2 | 9 | 6/6 passing | ~3 min | 2026-04-28 |
| 01-03 — pydantic-ai agent + 5 generic tools | 2 | 3 | 12/12 passing | ~4 min | 2026-04-28 |
| 01-04 — CLI + turn loop + playtest | 2 | 50 | 38/38 passing | ~25 min + 7 sessions playtest | 2026-04-28 |

## Accumulated Context

### Key Decisions (from PROJECT.md)

**v2.0 milestone decisions:**

- **`backend/` is the production target, not `backend_generalist/`** — strict schemas catch invalid state and make the API contract checkable; the v1 spike's "world as ad-hoc JSON" was the wrong trade for the live UI.
- **Simplify in-place rather than re-port from generalist** — generalist's tool surface and prompt shape are useful lessons, not a target replacement; `backend/` already has the schema discipline we want.
- **Three phases (Tier 2 → 3 → 4) in sequence** — each tier is independently verifiable against the same frontend smoke test; staging keeps blast radius small.
- **Frontend SSE wire format is invariant** — event types (`narration`, `thinking`, `pending_action`, `complete`, `error`) and payload field names must remain byte-compatible.

**v1.0 viability spike decisions (preserved for context):**

- Parallel `backend_generalist/` directory — kept live `backend/` untouched during the spike; verdict `play passed` 2026-04-28.
- Full unrestricted Bash in generalist — faithful coding-agent harness; max viability signal.
- Stdout-as-narration (no `narrate` tool) in generalist — viable but loses progressive streaming.
- Pre-seeded world directory from template — agent discovers state via Read/Glob.
- User self-validates e2e qualitatively — no auto eval harness.

### Open Todos

- v2 hardening backlog (carried forward): atomic JSON writes, session log persistence, agent-action quotas — orthogonal to simplification, not in this milestone.

### Blockers

None.

### Quick Tasks Completed

| # | Description | Date | Commit | Directory |
|---|-------------|------|--------|-----------|
| 260428-kuu | Add deepseek-v4-flash preset to backend and backend_generalist model registries | 2026-04-28 | 8f0a852 | [260428-kuu-add-deepseek-v4-flash-preset-to-backend-](./quick/260428-kuu-add-deepseek-v4-flash-preset-to-backend-/) |
| 260428-l47 | Pin deepseek-v4-flash preset to DeepSeek first-party OpenRouter endpoint (skip flaky AkashML) | 2026-04-28 | aa59185 | [260428-l47-pin-deepseek-v4-flash-preset-to-deepseek](./quick/260428-l47-pin-deepseek-v4-flash-preset-to-deepseek/) |
| 260506-fuv | Fix GM information leakage — Information Boundary prompt section, gm_-prefix scene state convention, read-aloud callouts on Part 1 openers | 2026-05-06 | 4394942 | [260506-fuv-fix-gm-information-leakage-in-backend-ge](./quick/260506-fuv-fix-gm-information-leakage-in-backend-ge/) |

### Risks (carried forward)

- **Subtle behavior drift during refactor** — fewer tools / shorter prompt / typed `GameState` could change agent behavior in non-obvious ways. Mitigation: smoke-test the web UI golden path after each phase; the SSE wire format invariant gives a hard signal.
- **Token-budget growth in long sessions** — deferred to a future hardening milestone unless surfaced during refactor.

## Session Continuity

**Last session ended:** 2026-05-19 — opened milestone v2.0 backend-simplification. v1.0 viability spike closed 2026-04-28 with verdict `play passed`; open question (promote generalist? keep parallel?) answered: keep `backend/` as production, archive generalist as reference. No code changes yet in v2.0.

**Next session should:**

1. Finish the requirements step of `/gsd-new-milestone` (REQUIREMENTS.md with REQ-IDs for v2.0 scope).
2. Run `gsd-roadmapper` to produce ROADMAP.md with Phase 2 (Tier 2), Phase 3 (Tier 3), Phase 4 (Tier 4).
3. Then `/gsd:discuss-phase 2` (or `/gsd:plan-phase 2`) to start the first phase.

**Files of record:**

- `.planning/PROJECT.md` — project context, constraints, current milestone, key decisions
- `.planning/REQUIREMENTS.md` — v1 requirements (validated) + v2 requirements (active) with traceability
- `.planning/ROADMAP.md` — phase delivery roadmap (will be regenerated for v2.0)
- `.planning/config.json` — coarse granularity, sequential phases, plan_check on, verifier off

---
*State initialized: 2026-04-28 (v1.0). Milestone switched to v2.0 backend-simplification: 2026-05-19.*
