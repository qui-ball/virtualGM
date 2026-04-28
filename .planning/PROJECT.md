# virtualGM — Generalist Backend

## What This Is

virtualGM is a solo tabletop RPG GM agent built on `pydantic-ai`. The current `backend/` ships ~15 domain-specific tools (`narrate`, `apply_damage`, `create_enemy`, `ask_player_roll`, `load_campaign_section`, etc.). This GSD project scopes a parallel rewrite — `backend_generalist/` — that replaces the domain tool layer with **generic coding-agent primitives only** (Read, Write, Edit, Glob, Bash) acting on a per-session world directory of JSON files. The deliverable is CLI-only and tests whether a coding-agent-style harness is a viable substrate for a GM agent.

## Core Value

**Prove that a GM agent can run end-to-end with no domain tools — just generic primitives over a JSON world directory.** If e2e play is coherent and stateful, the harness pattern is viable; if it isn't, we'll know what's missing.

## Requirements

### Validated

<!-- Existing virtualGM backend already ships these — out of scope for this milestone, but captured to anchor context. -->

- ✓ Solo TTRPG GM agent on `pydantic-ai` — `backend/` (existing)
- ✓ Domain-specific tool layer (~15 tools) — `backend/agent/tools.py` (existing)
- ✓ Frontend integration — `frontend/` (existing, not touched here)

### Active

<!-- Scope of this milestone: the backend_generalist/ viability spike. -->

- [ ] backend_generalist/ pydantic-ai agent with generic primitives only (Read, Write, Edit, Glob, Bash)
- [ ] Per-session world directory layout (campaign/, pc.json, world/, rules/) seeded from a template
- [ ] System prompt that teaches the agent to operate on the world dir as game state
- [ ] Simple CLI: launch a session, exchange turns with the agent over stdin/stdout, persist state to disk
- [ ] End-to-end playable: human can complete a meaningful slice of play (combat / scene / short adventure) without crashes or state loss
- [ ] No domain tools — narration is the agent's natural-language reply; player input is the next stdin message

### Out of Scope

- Frontend integration — viability is being assessed at the CLI layer; frontend wiring deferred until/unless the spike succeeds
- Replacing or modifying the existing `backend/` — `backend_generalist/` is parallel; current backend stays untouched
- Multi-player or networked play — solo only
- Production hardening (auth, rate limiting, telemetry) — experiment, not product
- New campaign authoring tooling — reuses whatever campaign content the existing repo has
- Migration plan from `backend/` to `backend_generalist/` — that decision waits on viability results

## Context

- **Existing repo:** brownfield. `backend/` contains the live domain-tool agent (`backend/agent/{definition,runner,tools}.py`); campaigns live in `backend/campaigns/`; recordings of prior runs live in `backend/recordings/`. The new code goes in a sibling `backend_generalist/` directory, intentionally not sharing the existing tool implementations.
- **Why this experiment:** the user wants to compare the design overhead of bespoke domain tools against a coding-agent-shaped harness. If a generic primitive set is sufficient, the GM domain becomes cheaper to evolve (no new tool every time the rules add a mechanic).
- **The harness analogy:** modeled after how Claude Code itself operates — Read/Write/Edit/Glob/Bash over a working directory, with the model's text output serving as user-facing communication. No `narrate` or `talk` tool needed; the model's natural reply IS the narration, and the CLI feeds the player's next message back as the next turn.
- **Game state as files:** state lives in JSON files inside `sessions/<id>/` (or similar). The agent reads/edits these directly — combat trackers, PC sheets, scene notes — using the same file primitives a coding agent uses for source code.

## Constraints

- **Tech stack**: Must use `pydantic-ai` (not switching agent frameworks).
- **Tool surface**: Read, Write, Edit, Glob, Bash — and nothing domain-specific. Full unrestricted Bash (the user explicitly chose this; closer to a real coding-agent harness, max viability signal).
- **Interface**: CLI only. No REST API, no websocket, no frontend wiring for this milestone.
- **Session bootstrap**: Pre-seeded world directory copied from a template at session start. Agent then discovers everything via Read/Glob.
- **Player I/O**: Pure stdin/stdout. The agent's free-text response is the narration; the next stdin line is the player's reply.

## Key Decisions

| Decision | Rationale | Outcome |
|----------|-----------|---------|
| Parallel `backend_generalist/` instead of branching `backend/` | Keep existing live agent untouched while the experiment runs; trivial to delete if it flops | — Pending |
| Full Bash (not sandboxed, not omitted) | Faithful coding-agent harness; gives the agent maximum room to be resourceful (jq, python, dice scripts); biggest viability signal | — Pending |
| Stdout for narration, no `talk`/`narrate` tool | Matches how generalist coding agents communicate; one fewer abstraction; aligned with pydantic-ai's natural output flow | — Pending |
| Pre-seeded world dir (not empty + system-prompt links) | Lets the agent rely on Read/Glob for discovery instead of a special "load" tool; mirrors how a coding agent enters a repo | — Pending |
| User self-validates e2e | Viability is qualitative; user prefers to evaluate play quality firsthand rather than pin a rigid acceptance test | — Pending |
| Skip domain research | Tech is known (`pydantic-ai`, JSON files, CLI). Research adds tokens without changing the build. | — Pending |

## Evolution

This document evolves at phase transitions and milestone boundaries.

**After each phase transition** (via `/gsd-transition`):
1. Requirements invalidated? → Move to Out of Scope with reason
2. Requirements validated? → Move to Validated with phase reference
3. New requirements emerged? → Add to Active
4. Decisions to log? → Add to Key Decisions
5. "What This Is" still accurate? → Update if drifted

**After each milestone** (via `/gsd-complete-milestone`):
1. Full review of all sections
2. Core Value check — still the right priority?
3. Audit Out of Scope — reasons still valid?
4. Update Context with current state

---
*Last updated: 2026-04-28 after initialization*
