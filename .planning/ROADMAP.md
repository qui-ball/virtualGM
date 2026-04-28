# Roadmap: virtualGM — Generalist Backend

**Created:** 2026-04-28
**Granularity:** coarse
**Coverage:** 14/14 v1 requirements mapped

## Core Value

Prove that a GM agent can run end-to-end with no domain tools — just generic primitives (Read, Write, Edit, Glob, Bash) over a JSON world directory.

## Phases

- [ ] **Phase 1: Generalist Harness + CLI** — Single-shot delivery of `backend_generalist/` agent, world template, per-session world dir, and stdin/stdout CLI turn loop. Playable end-to-end on a coarse-granularity viability spike.

## Phase Details

### Phase 1: Generalist Harness + CLI
**Goal**: A user can launch a CLI session that spins up a per-session world directory, plays a coherent slice of TTRPG with a `pydantic-ai` agent armed only with Read/Write/Edit/Glob/Bash primitives, and exits cleanly with state preserved on disk — proving (or disproving) the generalist-harness hypothesis.
**Depends on**: Nothing (greenfield directory `backend_generalist/`; existing `backend/` and `frontend/` are not touched)
**Requirements**:
  - HARN-01, HARN-02, HARN-03, HARN-04
  - WORLD-01, WORLD-02, WORLD-03
  - CLI-01, CLI-02, CLI-03, CLI-04
  - PLAY-01, PLAY-02, PLAY-03
**Success Criteria** (what must be TRUE):
  1. User can run a single CLI command (e.g. `python -m backend_generalist`) and the session prints a session ID and the absolute path of the per-session world directory at startup, with the directory existing on disk and seeded from the template (`campaign/`, `pc.json`, `world/`, `rules/`).
  2. User can complete a multi-turn slice of play (combat, scene, or short adventure) entirely over stdin/stdout where the agent's free-text reply is the narration — no domain `narrate`/`apply_damage`/etc. tool was called, only Read/Write/Edit/Glob/Bash.
  3. State continuity is observable across turns: HP, inventory, scene context, NPC status, etc. survive correctly because the agent edits the JSON files in the session world dir, and inspecting those files mid-session reflects the in-fiction state.
  4. Ctrl-C cleanly exits the CLI without corrupting the session directory; resuming inspection (e.g. `cat sessions/<id>/pc.json`) shows the last persisted state intact.
  5. All filesystem and shell tool calls are sandboxed to the active session world directory — the agent cannot Read/Write/Edit/Bash outside that directory tree (verified by inspecting tool wrappers / attempted escape).
**Plans**: 4 plans
  - [x] 01-01-PLAN.md — Sandbox primitive + backend_generalist package skeleton (HARN-02, HARN-03) — complete 2026-04-28
  - [x] 01-02-PLAN.md — World directory template + per-session bootstrap (WORLD-01, WORLD-02) — complete 2026-04-28
  - [x] 01-03-PLAN.md — pydantic-ai agent + 5 generic tools + system prompt (HARN-01, HARN-02, HARN-04) — complete 2026-04-28
  - [ ] 01-04-PLAN.md — CLI entry point + turn loop + human playtest checkpoint (CLI-01..04, WORLD-03, PLAY-01..03)

## Progress

| Phase | Plans Complete | Status | Completed |
|-------|----------------|--------|-----------|
| 1. Generalist Harness + CLI | 3/4 | In progress | - |

## Coverage

All 14 v1 requirements mapped to Phase 1. No orphans, no duplicates.

| Category | Requirements | Phase |
|----------|--------------|-------|
| Harness  | HARN-01, HARN-02, HARN-03, HARN-04 | 1 |
| World    | WORLD-01, WORLD-02, WORLD-03 | 1 |
| CLI      | CLI-01, CLI-02, CLI-03, CLI-04 | 1 |
| Playability | PLAY-01, PLAY-02, PLAY-03 | 1 |

**Rationale for single-phase structure:** This is a viability spike under coarse granularity. Splitting harness from CLI from world template would create phases that can't be independently validated — the only meaningful verification is end-to-end CLI play, which requires all four requirement clusters present. PLAY-* are properties of the integrated system, not a separate playtest milestone. Out-of-scope by user decision: integration phase, polish phase, eval harness, frontend wiring, migration phase.

---
*Roadmap created: 2026-04-28*
