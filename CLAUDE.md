<!-- GSD:project-start source:PROJECT.md -->
## Project

**virtualGM**

virtualGM is a solo tabletop RPG GM agent built on `pydantic-ai`. `backend/` is the runnable system (FastAPI + SSE, run via `./launch.sh`), shipping domain-specific tools (`narrate`, `apply_damage`, `create_enemy`, `ask_player_roll`, `load_campaign_section`, etc.).

A generalist-harness spike (`backend_generalist/`) explored replacing the domain tools with generic coding-agent primitives (Read, Write, Edit, Bash) over a JSON world directory. **That spike has concluded and been removed; the chosen direction is to simplify `backend/`'s existing domain tool surface rather than swap to a generic harness.**

### Constraints

- **Tech stack**: Must use `pydantic-ai` (not switching agent frameworks).
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
