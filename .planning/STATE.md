# State: virtualGM — Generalist Backend

## Project Reference

**Core Value:** Prove that a GM agent can run end-to-end with no domain tools — just generic primitives (Read, Write, Edit, Glob, Bash) over a JSON world directory.

**Current Focus:** Phase 1 — Generalist Harness + CLI (single-phase viability spike)

**Scope Boundary:** All new code lives in `backend_generalist/`. Existing `backend/` and `frontend/` are NOT modified. CLI-only deliverable.

## Current Position

- **Milestone:** v1 (viability spike)
- **Phase:** 1 — Generalist Harness + CLI
- **Plan:** None yet (run `/gsd-plan-phase 1`)
- **Status:** Roadmap complete, awaiting plan
- **Progress:** [□□□□□□□□□□] 0% (0/1 phases complete)

## Performance Metrics

- **v1 Requirements:** 14 total, 14 mapped, 0 complete
- **Phases:** 1 total, 0 complete
- **Plans:** 0 total

## Accumulated Context

### Key Decisions (from PROJECT.md)

- **Parallel `backend_generalist/` directory** — keep live `backend/` untouched; trivial to delete if spike flops.
- **Full unrestricted Bash** — faithful coding-agent harness; max viability signal (jq, python one-liners, dice scripts welcome).
- **Stdout for narration, no `talk`/`narrate` tool** — agent's natural-language reply IS the narration.
- **Pre-seeded world directory from template** — agent discovers state via Read/Glob, mirroring how a coding agent enters a repo.
- **User self-validates e2e qualitatively** — viability is a qualitative judgment call; no auto eval harness.
- **Skip domain research** — tech stack (`pydantic-ai`, JSON files, CLI) is already known.

### Open Todos

- Plan Phase 1 (`/gsd-plan-phase 1`)

### Blockers

None.

### Risks (carried forward)

- **Generic primitives may be insufficient** — the whole point of the spike. Surface explicitly during play; don't paper over.
- **Token-budget growth in long sessions** — deferred to v2 HARD-02 unless it blocks Phase 1 playtest.
- **Bash misuse** — accepted risk; user explicitly chose unrestricted Bash for harness fidelity.

## Session Continuity

**Last session ended:** 2026-04-28 — roadmap creation complete.

**Next session should:**
1. Run `/gsd-plan-phase 1` to decompose Phase 1 into executable plans.
2. Plans will likely cluster around: (a) generic-tool wrappers + sandboxing, (b) world template + per-session copy, (c) `pydantic-ai` agent wiring + system prompt, (d) CLI turn loop entry point.

**Files of record:**
- `.planning/PROJECT.md` — project context, constraints, key decisions
- `.planning/REQUIREMENTS.md` — 14 v1 requirements with traceability
- `.planning/ROADMAP.md` — single-phase delivery roadmap
- `.planning/config.json` — coarse granularity, sequential phases, plan_check on, verifier off

---
*State initialized: 2026-04-28*
