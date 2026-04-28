# Requirements: virtualGM — Generalist Backend

**Defined:** 2026-04-28
**Core Value:** Prove that a GM agent can run end-to-end with no domain tools — just generic primitives over a JSON world directory.

## v1 Requirements

Requirements for the viability spike. All map to roadmap phases.

### Harness

- [x] **HARN-01**: pydantic-ai agent module in `backend_generalist/` whose tool set is exactly `Read`, `Write`, `Edit`, `Glob`, `Bash` (no domain tools) — shipped in Plan 01-03 (`backend_generalist.agent.build_agent`; `register_tools` chokepoint enforces 5-tool surface)
- [x] **HARN-02**: Each generic tool is implemented as a thin wrapper that operates on (and is sandboxed to) the active session's world directory — sandbox chokepoint shipped in Plan 01-01 (`backend_generalist.sandbox.resolve_in_sandbox`); each of the 5 tools shipped in Plan 01-03 routes through it
- [x] **HARN-03**: `Bash` is unrestricted (full shell), executed inside the session world directory — `run_bash_in_sandbox` shipped in Plan 01-01 (`["bash", "-c", command]`, cwd=session_root, default timeout 120s); `bash` tool shipped in Plan 01-03 delegates to it with 32k-char output cap
- [x] **HARN-04**: System prompt teaches the agent: "your working directory is the world; read/edit JSON files to track game state; your reply text is what the player sees" — shipped in Plan 01-03 (`backend_generalist.agent.SYSTEM_PROMPT`, 3361 chars)

### World

- [x] **WORLD-01**: World directory template defined under `backend_generalist/` (e.g. `template_world/`) containing campaign/, pc.json, world/ scratch area, rules/ as needed — shipped in Plan 01-02 (`backend_generalist/template_world/`, 7 seed files)
- [x] **WORLD-02**: At session start, the CLI copies the template into a per-session directory (e.g. `sessions/<id>/`) — agent works on the copy — mechanism shipped in Plan 01-02 (`backend_generalist.world.create_session_world`); CLI wiring in Plan 01-04
- [x] **WORLD-03**: State persists between turns within a session (the JSON files on disk ARE the state) — closed in Plan 01-04 via mid-session inspection of `sessions/<id>/pc.json` / `world/scene.json` / `world/encounter.json` reflecting in-fiction state across turns

### CLI

- [x] **CLI-01**: A single CLI entry point (e.g. `python -m backend_generalist` or a script) that starts a new session and enters a turn loop — shipped in Plan 01-04 (`backend_generalist/cli.py` + `__main__.py`; Click + asyncio)
- [x] **CLI-02**: Turn loop = read player line from stdin → send to agent → print agent's free-text reply to stdout → repeat — shipped in Plan 01-04 (`run_chat()`; `console.input` for stdin, `Markdown(reply)` for stdout)
- [x] **CLI-03**: Session ID and world dir path are printed at startup so the user can inspect/resume — shipped in Plan 01-04 (`[session] id=...` / `[session] world=...`)
- [x] **CLI-04**: Clean shutdown on Ctrl-C (current world dir state is left intact on disk) — shipped in Plan 01-04 (`KeyboardInterrupt` handler; `try/finally`); covered by `test_run_chat_preserves_state_on_keyboard_interrupt`

### Playability

- [x] **PLAY-01**: A human can complete an end-to-end slice of play (combat, scene, or short adventure) without crashes or state corruption — verified in Plan 01-04 human checkpoint (`play passed`; 7 sessions played)
- [x] **PLAY-02**: Across multiple turns the agent demonstrates state continuity (HP, inventory, scene context, etc. survive correctly via the JSON files) — verified in Plan 01-04 human checkpoint via mid-session JSON inspection
- [x] **PLAY-03**: Narration is coherent and player-facing without any dedicated narration tool (text-reply pattern works) — verified in Plan 01-04 human checkpoint; `grep -cE "(narrate|apply_damage|create_enemy|...)" backend_generalist/{cli,agent,tools}.py` returns 0/0/0

## v2 Requirements

Deferred — only relevant if v1 demonstrates viability.

### Integration

- **INTG-01**: Wire `backend_generalist/` into the existing FastAPI/web layer
- **INTG-02**: Frontend integration parity with current `backend/`
- **INTG-03**: Conversation recording compatible with existing `backend/recordings/` format

### Hardening

- **HARD-01**: Tool-call sandbox / quotas for safety
- **HARD-02**: Token-budget management for long sessions
- **HARD-03**: Compaction strategy for long-running world dirs

## Out of Scope

| Feature | Reason |
|---------|--------|
| Modifying or replacing existing `backend/` | Parallel rewrite — current backend stays as the live reference |
| Frontend wiring | CLI-only viability test; frontend deferred until/unless spike succeeds |
| Multi-player or networked sessions | Solo TTRPG only |
| New campaign authoring | Reuse existing campaign content; no new authoring tooling |
| Production hardening (auth, rate limiting, telemetry) | Experiment, not product |
| Migration plan from `backend/` to `backend_generalist/` | Decision waits on viability outcome |
| Sandboxed/whitelisted Bash | User explicitly chose full Bash for max harness fidelity |
| Auto eval harness for "is play coherent" | User self-validates qualitatively via direct CLI play |

## Traceability

| Requirement | Phase | Status |
|-------------|-------|--------|
| HARN-01 | Phase 1 | Complete (Plan 01-03) |
| HARN-02 | Phase 1 | Complete (Plan 01-01; reaffirmed Plan 01-03) |
| HARN-03 | Phase 1 | Complete (Plan 01-01; reaffirmed Plan 01-03) |
| HARN-04 | Phase 1 | Complete (Plan 01-03) |
| WORLD-01 | Phase 1 | Complete (Plan 01-02) |
| WORLD-02 | Phase 1 | Complete (Plan 01-02) |
| WORLD-03 | Phase 1 | Complete (Plan 01-04) |
| CLI-01 | Phase 1 | Complete (Plan 01-04) |
| CLI-02 | Phase 1 | Complete (Plan 01-04) |
| CLI-03 | Phase 1 | Complete (Plan 01-04) |
| CLI-04 | Phase 1 | Complete (Plan 01-04) |
| PLAY-01 | Phase 1 | Complete (Plan 01-04 human checkpoint) |
| PLAY-02 | Phase 1 | Complete (Plan 01-04 human checkpoint) |
| PLAY-03 | Phase 1 | Complete (Plan 01-04 human checkpoint) |

**Coverage:**
- v1 requirements: 14 total
- Mapped to phases: 14 ✓
- Unmapped: 0
- Complete: 14 (all v1 requirements closed)

---
*Requirements defined: 2026-04-28*
*Last updated: 2026-04-28 — Plan 01-04 closed all remaining v1 requirements with verdict `play passed`. Viability hypothesis answered YES.*
