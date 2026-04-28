---
gsd_state_version: 1.0
milestone: v1.0
milestone_name: milestone
status: executing
last_updated: "2026-04-28T15:10:32Z"
progress:
  total_phases: 1
  completed_phases: 0
  total_plans: 4
  completed_plans: 2
  percent: 50
---

# State: virtualGM — Generalist Backend

## Project Reference

**Core Value:** Prove that a GM agent can run end-to-end with no domain tools — just generic primitives (Read, Write, Edit, Glob, Bash) over a JSON world directory.

**Current Focus:** Phase 01 — generalist-harness-cli

**Scope Boundary:** All new code lives in `backend_generalist/`. Existing `backend/` and `frontend/` are NOT modified. CLI-only deliverable.

## Current Position

Phase: 01 (generalist-harness-cli) — EXECUTING
Plan: 3 of 4 (next)

- **Milestone:** v1 (viability spike)
- **Phase:** 1 — Generalist Harness + CLI
- **Plan:** 01-02 complete; next is 01-03 (pydantic-ai agent + 5 generic tools + system prompt)
- **Status:** Executing Phase 01 (2/4 plans complete)
- **Progress:** [█████□□□□□] 50% (2/4 plans complete in only phase)

## Performance Metrics

- **v1 Requirements:** 14 total, 14 mapped, 4 complete (HARN-02, HARN-03, WORLD-01, WORLD-02)
- **Phases:** 1 total, 0 complete
- **Plans:** 4 total, 2 complete

| Phase-Plan | Tasks | Files | Tests | Duration | Completed |
|------------|-------|-------|-------|----------|-----------|
| 01-01 — sandbox primitive | 2 | 6 | 9/9 passing | ~8 min | 2026-04-28 |
| 01-02 — world template + bootstrap | 2 | 9 | 6/6 passing | ~3 min | 2026-04-28 |

## Accumulated Context

### Key Decisions (from PROJECT.md)

- **Parallel `backend_generalist/` directory** — keep live `backend/` untouched; trivial to delete if spike flops.
- **Full unrestricted Bash** — faithful coding-agent harness; max viability signal (jq, python one-liners, dice scripts welcome).
- **Stdout for narration, no `talk`/`narrate` tool** — agent's natural-language reply IS the narration.
- **Pre-seeded world directory from template** — agent discovers state via Read/Glob, mirroring how a coding agent enters a repo.
- **User self-validates e2e qualitatively** — viability is a qualitative judgment call; no auto eval harness.
- **Skip domain research** — tech stack (`pydantic-ai`, JSON files, CLI) is already known.
- **(01-01) Symlink confinement is implicit:** `Path.resolve()` follows symlinks, then `root in resolved.parents` rejects external targets. No separate symlink walk required.
- **(01-01) Bash uses `["bash", "-c", command]` explicit list, never `shell=True`** — avoids double-shell parsing while preserving full Bash inside the spawned shell. Matches HARN-03 / accepted risk T-01-05.
- **(01-02) Tests build their own template via `tmp_path`** — decouples test stability from on-disk seed content; future plans can edit campaign copy without touching test_world.py.
- **(01-02) Session ID = `uuid.uuid4().hex[:12]`** — 48 bits of entropy, sufficient for single-user CLI; threat T-02-02 documents acceptance.
- **(01-02) PC schema in template** mirrors `backend/game/models.py`: name, character_class, level, xp, stats {might/finesse/wit/presence}, hp, hp_max, evasion, mana, conditions, gold, inventory. Plan 01-03's system prompt will treat this as the contract.

### Open Todos

- Execute Plan 01-03 (pydantic-ai agent + 5 generic tools + system prompt, HARN-01/HARN-02/HARN-04)
- Execute Plan 01-04 (CLI entry point + turn loop + playtest checkpoint, CLI-01..04, WORLD-03, PLAY-01..03)

### Blockers

None.

### Risks (carried forward)

- **Generic primitives may be insufficient** — the whole point of the spike. Surface explicitly during play; don't paper over.
- **Token-budget growth in long sessions** — deferred to v2 HARD-02 unless it blocks Phase 1 playtest.
- **Bash misuse** — accepted risk; user explicitly chose unrestricted Bash for harness fidelity.

## Session Continuity

**Last session ended:** 2026-04-28 — Plan 01-02 (world template + per-session bootstrap) complete; 6/6 world tests passing (15/15 overall — no regression on Plan 01-01 sandbox); `backend_generalist.world.create_session_world` and `template_world/` available for downstream plans.

**Next session should:**

1. Execute Plan 01-03 — pydantic-ai agent + 5 generic tools (Read/Write/Edit/Glob/Bash) + system prompt (HARN-01/HARN-02/HARN-04). Tools will wrap `backend_generalist.sandbox.{resolve_in_sandbox, run_bash_in_sandbox}` from Plan 01-01.
2. Then 01-04 (CLI + turn loop + playtest) — calls `create_session_world()` from Plan 01-02 at startup.

**Files of record:**

- `.planning/PROJECT.md` — project context, constraints, key decisions
- `.planning/REQUIREMENTS.md` — 14 v1 requirements with traceability
- `.planning/ROADMAP.md` — single-phase delivery roadmap
- `.planning/config.json` — coarse granularity, sequential phases, plan_check on, verifier off

---
*State initialized: 2026-04-28*
