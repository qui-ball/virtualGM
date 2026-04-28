<!-- GSD:project-start source:PROJECT.md -->
## Project

**virtualGM — Generalist Backend**

virtualGM is a solo tabletop RPG GM agent built on `pydantic-ai`. The current `backend/` ships ~15 domain-specific tools (`narrate`, `apply_damage`, `create_enemy`, `ask_player_roll`, `load_campaign_section`, etc.). This GSD project scopes a parallel rewrite — `backend_generalist/` — that replaces the domain tool layer with **generic coding-agent primitives only** (Read, Write, Edit, Glob, Bash) acting on a per-session world directory of JSON files. The deliverable is CLI-only and tests whether a coding-agent-style harness is a viable substrate for a GM agent.

**Core Value:** **Prove that a GM agent can run end-to-end with no domain tools — just generic primitives over a JSON world directory.** If e2e play is coherent and stateful, the harness pattern is viable; if it isn't, we'll know what's missing.

### Constraints

- **Tech stack**: Must use `pydantic-ai` (not switching agent frameworks).
- **Tool surface**: Read, Write, Edit, Glob, Bash — and nothing domain-specific. Full unrestricted Bash (the user explicitly chose this; closer to a real coding-agent harness, max viability signal).
- **Interface**: CLI only. No REST API, no websocket, no frontend wiring for this milestone.
- **Session bootstrap**: Pre-seeded world directory copied from a template at session start. Agent then discovers everything via Read/Glob.
- **Player I/O**: Pure stdin/stdout. The agent's free-text response is the narration; the next stdin line is the player's reply.
<!-- GSD:project-end -->

<!-- GSD:stack-start source:STACK.md -->
## Technology Stack

Technology stack not yet documented. Will populate after codebase mapping or first phase.
<!-- GSD:stack-end -->

<!-- GSD:conventions-start source:CONVENTIONS.md -->
## Conventions

Conventions not yet established. Will populate as patterns emerge during development.
<!-- GSD:conventions-end -->

<!-- GSD:architecture-start source:ARCHITECTURE.md -->
## Architecture

Architecture not yet mapped. Follow existing patterns found in the codebase.
<!-- GSD:architecture-end -->

<!-- GSD:skills-start source:skills/ -->
## Project Skills

No project skills found. Add skills to any of: `.claude/skills/`, `.agents/skills/`, `.cursor/skills/`, `.github/skills/`, or `.codex/skills/` with a `SKILL.md` index file.
<!-- GSD:skills-end -->

<!-- GSD:workflow-start source:GSD defaults -->
## GSD Workflow Enforcement

Before using Edit, Write, or other file-changing tools, start work through a GSD command so planning artifacts and execution context stay in sync.

Use these entry points:
- `/gsd-quick` for small fixes, doc updates, and ad-hoc tasks
- `/gsd-debug` for investigation and bug fixing
- `/gsd-execute-phase` for planned phase work

Do not make direct repo edits outside a GSD workflow unless the user explicitly asks to bypass it.
<!-- GSD:workflow-end -->



<!-- GSD:profile-start -->
## Developer Profile

> Profile not yet configured. Run `/gsd-profile-user` to generate your developer profile.
> This section is managed by `generate-claude-profile` -- do not edit manually.
<!-- GSD:profile-end -->
