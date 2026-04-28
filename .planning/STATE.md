---
gsd_state_version: 1.0
milestone: v1.0
milestone_name: milestone
status: phase_complete
last_updated: "2026-04-28T20:00:00Z"
progress:
  total_phases: 1
  completed_phases: 1
  total_plans: 4
  completed_plans: 4
  percent: 100
---

# State: virtualGM — Generalist Backend

## Project Reference

**Core Value:** Prove that a GM agent can run end-to-end with no domain tools — just generic primitives (Read, Write, Edit, Glob, Bash) over a JSON world directory.

**Current Focus:** Phase 01 — generalist-harness-cli

**Scope Boundary:** All new code lives in `backend_generalist/`. Existing `backend/` and `frontend/` are NOT modified. CLI-only deliverable.

## Current Position

Phase: 01 (generalist-harness-cli) — COMPLETE
Plan: 4 of 4 (done)

- **Milestone:** v1 (viability spike) — verdict reached
- **Phase:** 1 — Generalist Harness + CLI — **complete**
- **Plan:** 01-04 closed with verdict `play passed`
- **Status:** Phase 01 complete; awaiting `/gsd-verify-work` or `/gsd-complete-milestone`
- **Progress:** [██████████] 100% (4/4 plans complete; viability hypothesis ANSWERED — yes)

## Performance Metrics

- **v1 Requirements:** 14 total, 14 mapped, 14 complete (all HARN-*, WORLD-*, CLI-*, PLAY-* satisfied)
- **Phases:** 1 total, 1 complete
- **Plans:** 4 total, 4 complete

| Phase-Plan | Tasks | Files | Tests | Duration | Completed |
|------------|-------|-------|-------|----------|-----------|
| 01-01 — sandbox primitive | 2 | 6 | 9/9 passing | ~8 min | 2026-04-28 |
| 01-02 — world template + bootstrap | 2 | 9 | 6/6 passing | ~3 min | 2026-04-28 |
| 01-03 — pydantic-ai agent + 5 generic tools | 2 | 3 | 12/12 passing | ~4 min | 2026-04-28 |
| 01-04 — CLI + turn loop + playtest | 2 | 50 | 38/38 passing | ~25 min + 7 sessions playtest | 2026-04-28 |

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
- **(01-04) Read-only top-level subtree convention:** `campaign/` and `rules/` are reference material — `write_file`/`edit_file` raise ModelRetry; `read_file`/`glob_files`/`bash` unaffected. Bash is intentionally not guarded (HARN-03). Live state is `pc.json` at root + `world/`.
- **(01-04) Tool-call telemetry via pydantic-ai node iteration** — `Agent.is_call_tools_node` / `is_model_request_node` plus inspecting `ToolCallPart` / `ToolReturnPart` / `ThinkingPart`. Renders inline through `rich`. Trade-off: Markdown narration is post-rendered as a single block (not streamed) — visibility into tool calls was the dominant UX win.
- **(01-04) Hatch wheel build needs `[tool.hatch.build.targets.wheel] packages = ["."]`** because the project IS the directory; without it, hatch's auto-detection refuses to build.
- **(01-04) Viability verdict: `play passed`.** Generalist-harness pattern (5 generic primitives over JSON world dir) viable for solo TTRPG GM agent. Friction points found are substrate-shaped (read-only contract, operator visibility, real source material), not pattern failures.

### Open Todos

- Decide whether to promote `backend_generalist/` to replace `backend/` or keep it parallel (separate from the viability question, which is answered).
- v2 hardening backlog: atomic JSON writes (HARD-01), session log persistence, agent-action quotas.

### Blockers

None.

### Risks (carried forward)

- **Generic primitives may be insufficient** — the whole point of the spike. Surface explicitly during play; don't paper over.
- **Token-budget growth in long sessions** — deferred to v2 HARD-02 unless it blocks Phase 1 playtest.
- **Bash misuse** — accepted risk; user explicitly chose unrestricted Bash for harness fidelity.

## Session Continuity

**Last session ended:** 2026-04-28 — Plan 01-04 (CLI + turn loop + playtest) complete with verdict `play passed`. 7 sessions played; substrate hardened in commit `ebb8b5f` (read-only `campaign/`+`rules/` enforcement, rich-rendered tool-call telemetry, full LMoP campaign content seeded). 38/38 tests passing across the full backend_generalist suite. All 14 v1 requirements satisfied. **Phase 01 — and the milestone — closed; viability hypothesis answered YES.**

**Next session should:**

1. Run `/gsd-verify-work` to formally close Phase 01 (optional — Phase 01 was a single-phase milestone with a human-verified checkpoint as its acceptance gate, which was passed live).
2. Or run `/gsd-complete-milestone` to archive the milestone artifacts and mark the milestone done.
3. Open follow-up question: promote `backend_generalist/` to replace `backend/`, keep parallel, or archive — separate decision from the viability verdict.

**Files of record:**

- `.planning/PROJECT.md` — project context, constraints, key decisions
- `.planning/REQUIREMENTS.md` — 14 v1 requirements with traceability
- `.planning/ROADMAP.md` — single-phase delivery roadmap
- `.planning/config.json` — coarse granularity, sequential phases, plan_check on, verifier off

---
*State initialized: 2026-04-28*
