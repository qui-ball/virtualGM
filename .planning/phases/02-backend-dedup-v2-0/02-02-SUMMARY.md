---
phase: 02-backend-dedup-v2-0
plan: 02
subsystem: api
tags: [pydantic-ai, system-prompt, sse, ruleset, agent]

# Dependency graph
requires:
  - phase: 02-01
    provides: shared SSE turn-stream core (_stream_core) — wire format stable for the golden-path smoke gate
provides:
  - Trimmed GM system prompt with no per-tool signature enumeration (tool docs live only in @gm_agent.tool docstrings)
  - Generic (de-named) ## Output Format block referencing the narration tool by role, not literal narrate()
  - Static module-load embed of core-ruleset.md into the agent's instructions= string (no per-turn dynamic injection)
  - End-of-phase human-verified golden-path UI smoke (deferred dice-roll round-trip, byte-compatible SSE)
affects: [tool-surface-consolidation, gamestate-pydantic]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Static-at-module-load constant for invariant prompt content; only ctx.deps-dependent content stays as @gm_agent.instructions hooks"
    - "Single-source tool documentation: tool shape documented only in @gm_agent.tool docstrings, never re-enumerated in the prompt"

key-files:
  created:
    - .planning/phases/02-backend-dedup-v2-0/02-02-SUMMARY.md
  modified:
    - backend/agent/definition.py

key-decisions:
  - "Ruleset embedded once at module load (EMBEDDED_RULESET constant) rather than re-read per turn — DEDUP-03"
  - "Tool-shape docs centralized in @gm_agent.tool docstrings; prompt's Tools: enumeration deleted entirely — DEDUP-02"
  - "Output Format de-named generically while preserving narration/private-notes/one-beat-per-turn behavioral rules verbatim in intent — D-06"
  - "End-of-phase smoke runs once (D-14), not per-commit; manual golden-path UI verification, no automated SSE-fixture harness (D-13)"

patterns-established:
  - "Surgical prompt trims preserve adjudication/behavior sections (Skill Checks, Combat Rules, Core Responsibilities, GM Style, Pacing) verbatim — only tool-signature noise is removed"
  - "Invariant prompt content is static; per-run content is dynamic — clean separation of @gm_agent.instructions hooks"

requirements-completed: [DEDUP-02, DEDUP-03, INV-01, INV-02, INV-03, INV-04, INV-05]

# Metrics
duration: ~prior-session + finalization
completed: 2026-05-20
---

# Phase 02 Plan 02: Trim system prompt + statically embed ruleset Summary

**Trimmed the GM system prompt to remove per-tool signature enumeration and the literal `narrate()` reference, statically embedded `core-ruleset.md` into the agent's `instructions=` at module load (removing the `add_ruleset` dynamic hook), and human-verified a golden-path deferred-dice-roll turn through the React UI with byte-compatible SSE and zero frontend edits.**

## Performance

- **Duration:** Tasks 1-2 executed in the prior session; finalization (Task 3 gate approval + summary) this session
- **Started:** 2026-05-20 (prior 02-02 executor)
- **Completed:** 2026-05-20T (this finalization)
- **Tasks:** 3 (2 auto + 1 checkpoint:human-verify)
- **Files modified:** 1 (`backend/agent/definition.py`; net -18 lines: +15 / -33)

## Accomplishments
- Deleted the entire `Tools:` per-tool enumeration block from the system prompt; tool-shape documentation now lives only in `@gm_agent.tool` docstrings (DEDUP-02).
- Rewrote `## Output Format` to reference the narration tool generically (no literal `narrate()`), preserving the narration/private-notes/one-beat-per-turn rules in intent (DEDUP-02 / D-06).
- Read `core-ruleset.md` once at module load into a module-level constant and concatenated it into the static `instructions=` string, wrapped in `<ruleset>...</ruleset>`; removed the `@gm_agent.instructions def add_ruleset()` hook entirely. `add_campaign` and `current_game_state` remain dynamic hooks (DEDUP-03).
- Kept `## Skill Checks` (incl. the easy 8 / moderate 12 / hard 15 DC ladder), `## Combat Rules Summary`, `## Core Responsibilities`, `## GM Style`, and `## Pacing` verbatim (D-07/D-08).
- End-of-phase smoke (Task 3, human-verified): CLI smoke (INV-03) passed; a full turn including a deferred dice-roll round-trip completed through the React UI with no frontend edits, SSE event sequence and payload field names unchanged (INV-01/INV-02).

## Task Commits

1. **Task 1: Embed ruleset statically at module load, remove add_ruleset hook** — `b10b86c` (refactor)
2. **Task 2: Trim Tools: enumeration + de-name Output Format block** — `d67de1b` (refactor)
3. **Task 3: End-of-phase manual golden-path UI smoke (Plans 01 + 02)** — checkpoint:human-verify gate, **APPROVED** by user (no code commit; verification-only)

**Plan metadata:** see final docs commit below (docs: complete plan)

## Files Created/Modified
- `backend/agent/definition.py` — Embedded `core-ruleset.md` at module load into a static `instructions=` constant; removed `add_ruleset` hook; deleted the `Tools:` enumeration; de-named the `## Output Format` block. `add_campaign` + `current_game_state` remain dynamic.

## Verification Results

Acceptance-criteria grep/import checks (re-confirmed at finalization):
- `grep -c 'def add_ruleset' agent/definition.py` → 0 (hook removed — DEDUP-03)
- `grep -c '@gm_agent.instructions' agent/definition.py` → 2 (only `add_campaign` + `current_game_state` — D-10)
- `grep -c 'core-ruleset.md' agent/definition.py` → 1 (read once at module load)
- `grep -c '<ruleset>' agent/definition.py` → 1 (wrapped + embedded in static instructions)
- `grep -c 'narrate()' agent/definition.py` → 0 (Output Format de-named — DEDUP-02 / D-06)
- `grep -c 'roll_dice(count' agent/definition.py` → 0 (Tools: enumeration deleted — D-05)
- `grep -c '## Skill Checks' agent/definition.py` → 1 (DC ladder kept — D-07)
- INV-04: `backend_generalist/` untouched vs phase-start (`9f0f4ea`).

Human-verified gate (Task 3):
- Automated INV-03 import quick-check: `import app; import api.turn_engine; import agent.definition` all succeed — PASSED.
- Manual golden-path UI smoke (INV-01/INV-02): a full turn including a deferred dice-roll round-trip completed through the React UI with no frontend edits; SSE event sequence and payload field names unchanged — user confirmed PASSED.

## Decisions Made
None beyond those specified in the plan (D-05 through D-14 followed as written). Constant named `EMBEDDED_RULESET` per Claude's discretion as allowed by the plan.

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered
None within plan scope. (A docker-compose boot issue surfaced during manual verification — the compose `env_file` only loaded `.env.docker`, which lacks `OPENROUTER_API_KEY`; it was resolved separately by adding `.env` to the compose `env_file`. This is unrelated to plan 02-02's code, out of scope, and is not a code deviation. `docker-compose.yml` is intentionally NOT staged or committed by this plan.)

## User Setup Required
None - no external service configuration required by this plan.

## Next Phase Readiness
- Phase 2 (backend-dedup) is now complete: 2/2 plans landed. SSE wire format remains byte-compatible (INV-01) and the CLI smoke passes (INV-03).
- The system prompt is now trimmed to behavior/pacing/style/adjudication rules only, setting up Phase 3 (tool-surface-consolidation) for a clean tool-merging diff in `agent/tools.py` without simultaneous prompt rewrites.
- No blockers.

## Self-Check: PASSED

- FOUND: `backend/agent/definition.py`
- FOUND commit: `b10b86c` (Task 1)
- FOUND commit: `d67de1b` (Task 2)
- INV-04: `backend_generalist/` UNTOUCHED vs phase start
- All acceptance-criteria grep/import checks re-confirmed (see Verification Results)

---
*Phase: 02-backend-dedup-v2-0*
*Completed: 2026-05-20*
