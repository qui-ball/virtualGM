---
gsd_state_version: 1.0
milestone: v2.0
milestone_name: — backend-simplification)
status: completed
last_updated: "2026-05-22T03:24:28.199Z"
last_activity: 2026-05-20 -- Phase 03 marked complete
progress:
  total_phases: 4
  completed_phases: 3
  total_plans: 8
  completed_plans: 8
  percent: 75
---

# State: virtualGM — Solo TTRPG GM Agent

## Project Reference

**Core Value:** Ship a maintainable, schema-enforced TTRPG GM agent backend that drives the existing web UI without ad-hoc tool sprawl or duplicated state surfaces.

**Current Focus:** Phase 03 — tool-surface-consolidation-v2-0

**Scope Boundary:** All work targets `backend/`. `backend_generalist/` is archived as v1.0 reference and is NOT modified. `frontend/` SSE wire format is invariant.

## Current Position

Phase: 03 — COMPLETE
Plan: 2 of 2
Status: Phase 03 complete
Last activity: 2026-05-20 -- Phase 03 marked complete

## Performance Metrics

- **v2.0 Requirements:** 13 deliverables (4 DEDUP + 6 TOOLS + 3 STATE) + 5 invariants = 18 mapped items
- **Phases:** 0 / 3 (Phase 2 backend-dedup, Phase 3 tool-surface-consolidation, Phase 4 gamestate-pydantic)
- **Plans:** 0 / TBD (set during per-phase planning)

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
- **Phase ordering (2 → 3 → 4 sequential):** Phase 2 trims the prompt before Phase 3 merges tools (cleaner diffs in `agent/definition.py` and `agent/tools.py`). Phase 3 shrinks the tool surface before Phase 4 retypes `GameState` (fewer call sites to migrate).

**Phase 3 Plan 01 decisions (2026-05-20):**

- **Tool-count baseline corrected 17 → ≤14 (D-10):** the roadmap's "~15 → ≤11" was anchored to a wrong baseline; real registered count was 17. Named consolidations (inventory pair, countdown pair, set_boss_battle) drop exactly 3 → 14. No over-merging beyond the named consolidations.
- **TOOLS-05 (implicit-LRU section caching) DESCOPED this phase (D-09):** `load_campaign_section` / `unload_campaign_section` stay manual with the 3-section cap. ROADMAP success-criterion #4 and REQUIREMENTS TOOLS-05 marked DEFERRED to avoid a silent verification gap.
- **Boss flag relocated, not removed (D-07/D-08/D-08b):** `GameState.is_boss_battle` field kept unchanged (class shape is Phase 4); write moved onto `apply_damage(is_boss=True)`; auto-cleared in `remove_enemy` when the last enemy is removed (only structured combat-end signal in the live stack).

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

**Last session ended:** 2026-05-20 — executed and finalized Phase 2 Plan 02 (trim system prompt + statically embed ruleset), completing Phase 2 (2/2 plans). In `backend/agent/definition.py`: read `core-ruleset.md` once at module load into a constant embedded in the static `instructions=` string (wrapped in `<ruleset>...</ruleset>`), removed the `@gm_agent.instructions add_ruleset` hook (`add_campaign` + `current_game_state` remain dynamic); deleted the per-tool `Tools:` enumeration block; de-named the `## Output Format` block (no literal `narrate()`) while preserving narration/private-notes/one-beat rules; kept Skill Checks (DC ladder), Combat Rules, Core Responsibilities, GM Style, Pacing verbatim. End-of-phase golden-path UI smoke (Task 3, checkpoint:human-verify) APPROVED: CLI smoke (INV-03) + deferred dice-roll round-trip through React UI with no frontend edits and byte-compatible SSE (INV-01/INV-02). Requirements DEDUP-02, DEDUP-03 marked complete; INV-01..05 verified for Phase 2; INV-04 (`backend_generalist/` untouched). Commits: b10b86c (refactor — ruleset embed), d67de1b (refactor — prompt trim).

**Prior session (2026-05-20):** executed Phase 2 Plan 01 (backend SSE de-dup). De-duplicated `stream_turn`/`stream_deferred_response` in `backend/api/turn_engine.py` into a single `_stream_core(session, runner_kwargs)` async generator; both entry points are now ≤5-line delegating wrappers with stable names/signatures (app.py imports unchanged). Deleted scratch files `backend/agent_test.py` and `backend/test_agent.py` (`test_tps.py` untouched). Requirements DEDUP-01, DEDUP-04 marked complete. Commits: dced6e6 (refactor), 97845f1 (chore).

**Prior session (2026-05-19):** wrote v2.0 ROADMAP.md (Phases 2, 3, 4). v1.0 Phase 1 preserved as historical "Completed (v1.0)" section. Coverage validated: 13/13 deliverables mapped, INV-01..INV-05 attached to every v2.0 phase. No orphaned requirements.

**Next session should:**

1. Transition via `/gsd-transition` to close out Phase 2 and open Phase 3.
2. Run `/gsd-discuss-phase 3` (or `/gsd-plan-phase 3`) to start Phase 3 (tool-surface-consolidation), targeting `backend/agent/tools.py` — merge inventory pair, merge countdown pair, retire `set_boss_battle`, factor level-up out of `award_xp`, replace manual load/unload + 3-section cap with implicit LRU (TOOLS-01..06, ≤11 tools).
3. The trimmed prompt from Phase 2 means Phase 3's diff should be purely about tool merging in `tools.py`, not prompt rewrites in `definition.py`.

**Files of record:**

- `.planning/PROJECT.md` — project context, constraints, current milestone, key decisions
- `.planning/REQUIREMENTS.md` — v1 requirements (validated) + v2 requirements (active) with traceability
- `.planning/ROADMAP.md` — phase delivery roadmap (Phase 1 v1.0 complete; Phases 2/3/4 v2.0 planned)
- `.planning/config.json` — coarse granularity, sequential phases, plan_check on, verifier off

---
*State initialized: 2026-04-28 (v1.0). Milestone switched to v2.0 backend-simplification: 2026-05-19. ROADMAP.md generated for v2.0: 2026-05-19.*
