# Requirements: virtualGM — Generalist Backend

**Defined:** 2026-04-28
**Core Value:** Prove that a GM agent can run end-to-end with no domain tools — just generic primitives over a JSON world directory.

## v1 Requirements

Requirements for the viability spike. All map to roadmap phases.

### Harness

- [ ] **HARN-01**: pydantic-ai agent module in `backend_generalist/` whose tool set is exactly `Read`, `Write`, `Edit`, `Glob`, `Bash` (no domain tools)
- [ ] **HARN-02**: Each generic tool is implemented as a thin wrapper that operates on (and is sandboxed to) the active session's world directory
- [ ] **HARN-03**: `Bash` is unrestricted (full shell), executed inside the session world directory
- [ ] **HARN-04**: System prompt teaches the agent: "your working directory is the world; read/edit JSON files to track game state; your reply text is what the player sees"

### World

- [ ] **WORLD-01**: World directory template defined under `backend_generalist/` (e.g. `template_world/`) containing campaign/, pc.json, world/ scratch area, rules/ as needed
- [ ] **WORLD-02**: At session start, the CLI copies the template into a per-session directory (e.g. `sessions/<id>/`) — agent works on the copy
- [ ] **WORLD-03**: State persists between turns within a session (the JSON files on disk ARE the state)

### CLI

- [ ] **CLI-01**: A single CLI entry point (e.g. `python -m backend_generalist` or a script) that starts a new session and enters a turn loop
- [ ] **CLI-02**: Turn loop = read player line from stdin → send to agent → print agent's free-text reply to stdout → repeat
- [ ] **CLI-03**: Session ID and world dir path are printed at startup so the user can inspect/resume
- [ ] **CLI-04**: Clean shutdown on Ctrl-C (current world dir state is left intact on disk)

### Playability

- [ ] **PLAY-01**: A human can complete an end-to-end slice of play (combat, scene, or short adventure) without crashes or state corruption
- [ ] **PLAY-02**: Across multiple turns the agent demonstrates state continuity (HP, inventory, scene context, etc. survive correctly via the JSON files)
- [ ] **PLAY-03**: Narration is coherent and player-facing without any dedicated narration tool (text-reply pattern works)

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

Populated during roadmap creation.

| Requirement | Phase | Status |
|-------------|-------|--------|
| HARN-01 | TBD | Pending |
| HARN-02 | TBD | Pending |
| HARN-03 | TBD | Pending |
| HARN-04 | TBD | Pending |
| WORLD-01 | TBD | Pending |
| WORLD-02 | TBD | Pending |
| WORLD-03 | TBD | Pending |
| CLI-01 | TBD | Pending |
| CLI-02 | TBD | Pending |
| CLI-03 | TBD | Pending |
| CLI-04 | TBD | Pending |
| PLAY-01 | TBD | Pending |
| PLAY-02 | TBD | Pending |
| PLAY-03 | TBD | Pending |

**Coverage:**
- v1 requirements: 14 total
- Mapped to phases: 0 (pending roadmap)
- Unmapped: 14 ⚠️

---
*Requirements defined: 2026-04-28*
*Last updated: 2026-04-28 after initial definition*
