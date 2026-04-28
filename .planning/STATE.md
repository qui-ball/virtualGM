---
gsd_state_version: 1.0
milestone: v1.0
milestone_name: milestone
status: executing
last_updated: "2026-04-28T15:20:00Z"
progress:
  total_phases: 1
  completed_phases: 0
  total_plans: 4
  completed_plans: 3
  percent: 75
---

# State: virtualGM — Generalist Backend

## Project Reference

**Core Value:** Prove that a GM agent can run end-to-end with no domain tools — just generic primitives (Read, Write, Edit, Glob, Bash) over a JSON world directory.

**Current Focus:** Phase 01 — generalist-harness-cli

**Scope Boundary:** All new code lives in `backend_generalist/`. Existing `backend/` and `frontend/` are NOT modified. CLI-only deliverable.

## Current Position

Phase: 01 (generalist-harness-cli) — EXECUTING
Plan: 4 of 4 (next)

- **Milestone:** v1 (viability spike)
- **Phase:** 1 — Generalist Harness + CLI
- **Plan:** 01-03 complete; next is 01-04 (CLI entry point + turn loop + playtest)
- **Status:** Executing Phase 01 (3/4 plans complete)
- **Progress:** [████████□□] 75% (3/4 plans complete in only phase)

## Performance Metrics

- **v1 Requirements:** 14 total, 14 mapped, 7 complete (HARN-01, HARN-02, HARN-03, HARN-04, WORLD-01, WORLD-02; HARN-02 mechanism reaffirmed at agent layer)
- **Phases:** 1 total, 0 complete
- **Plans:** 4 total, 3 complete

| Phase-Plan | Tasks | Files | Tests | Duration | Completed |
|------------|-------|-------|-------|----------|-----------|
| 01-01 — sandbox primitive | 2 | 6 | 9/9 passing | ~8 min | 2026-04-28 |
| 01-02 — world template + bootstrap | 2 | 9 | 6/6 passing | ~3 min | 2026-04-28 |
| 01-03 — pydantic-ai agent + 5 generic tools | 2 | 3 | 12/12 passing | ~4 min | 2026-04-28 |

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
- **(01-03) Imperative `agent.tool(fn)` over `@agent.tool` decorator** — keeps tools as pure module-level functions (testable without ctor side effects); the existing `backend/agent/tools.py` uses decorators because tools.py has no separate factory, but the generalist plan benefits from the explicit `register_tools` chokepoint enforcing the 5-tool surface.
- **(01-03) Test fixture uses `types.SimpleNamespace(deps=_Deps(...))` instead of pydantic-ai's RunContext directly** — tools only read `ctx.deps.session_root`, so the shim is sufficient and isolates tests from pydantic-ai version drift.
- **(01-03) SYSTEM_PROMPT avoids the bare verb 'narrate'/'narrating'** — uses 'narration'/'describe' to satisfy the strict acceptance grep `(narrate|apply_damage|create_enemy)` returning 0; HARN-04 substance ('reply IS the narration', 'no separate narration tool') preserved verbatim.
- **(01-03) Bash output cap = 32_000 chars** with `[truncated]` marker (T-03-05 mitigation) — Test 12 enforces with 100k-byte input.
- **(01-03) `build_agent()` requires `OPENROUTER_API_KEY` at construction time** — OpenRouter provider's contract; tests bypass by exercising tool functions directly. Plan 04 CLI must load `.env` (python-dotenv already in pyproject).

### Open Todos

- Execute Plan 01-04 (CLI entry point + turn loop + playtest checkpoint, CLI-01..04, WORLD-03, PLAY-01..03)

### Blockers

None.

### Risks (carried forward)

- **Generic primitives may be insufficient** — the whole point of the spike. Surface explicitly during play; don't paper over.
- **Token-budget growth in long sessions** — deferred to v2 HARD-02 unless it blocks Phase 1 playtest.
- **Bash misuse** — accepted risk; user explicitly chose unrestricted Bash for harness fidelity.

## Session Continuity

**Last session ended:** 2026-04-28 — Plan 01-03 (pydantic-ai agent + 5 generic tools + system prompt) complete; 12/12 tool tests passing (27/27 overall — no regression on Plans 01-01/01-02). `backend_generalist.tools` exports the 5-tool surface (read_file/write_file/edit_file/glob_files/bash) routed through Plan 01-01's sandbox; `backend_generalist.agent.build_agent()` returns a wired pydantic-ai Agent + OpenRouter settings; `GMDeps` carries session_root via RunContext.deps. HARN-01, HARN-02 (reaffirmed at agent layer), HARN-03 (reaffirmed via bash tool), HARN-04 closed.

**Next session should:**

1. Execute Plan 01-04 — CLI entry point + turn loop + human playtest checkpoint (CLI-01..04, WORLD-03, PLAY-01..03). The CLI calls `create_session_world()` (Plan 01-02) at startup and drives `build_agent()` (Plan 01-03) with a `GMDeps(session_root=...)` over an `agent.iter()`-based stdin/stdout turn loop. Don't forget to load `.env` so `OPENROUTER_API_KEY` is available at agent construction.

**Files of record:**

- `.planning/PROJECT.md` — project context, constraints, key decisions
- `.planning/REQUIREMENTS.md` — 14 v1 requirements with traceability
- `.planning/ROADMAP.md` — single-phase delivery roadmap
- `.planning/config.json` — coarse granularity, sequential phases, plan_check on, verifier off

---
*State initialized: 2026-04-28*
