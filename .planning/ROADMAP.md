# Roadmap: virtualGM — Solo TTRPG GM Agent

## Core Value

Ship a maintainable, schema-enforced TTRPG GM agent backend that drives the existing web UI without ad-hoc tool sprawl or duplicated state surfaces. `backend/` is the production target; `backend_generalist/` stays archived as v1.0 reference.

## Milestones

- ✅ **v1.0 generalist-viability-spike** — Phase 1 (shipped 2026-04-28) — verdict `play passed`.
- ✅ **v2.0 backend-simplification** — Phases 2–4 (shipped 2026-05-26). Full detail: [milestones/v2.0-ROADMAP.md](./milestones/v2.0-ROADMAP.md)

## Phases

<details>
<summary>✅ v1.0 generalist-viability-spike (Phase 1) — SHIPPED 2026-04-28</summary>

- [x] **Phase 1: Generalist Harness + CLI** (4/4 plans) — `backend_generalist/` agent, world template, per-session world dir, stdin/stdout CLI turn loop. Verdict `play passed`.

</details>

<details>
<summary>✅ v2.0 backend-simplification (Phases 2–4) — SHIPPED 2026-05-26</summary>

- [x] **Phase 2: backend-dedup** (2/2 plans) — shared SSE `_stream_core`, trimmed prompt, static ruleset, test-file overlap resolved. Completed 2026-05-20.
- [x] **Phase 3: tool-surface-consolidation** (2/2 plans) — tool surface 17 → 14 (inventory/countdown merges, `set_boss_battle` retired, level-up factored out). Completed 2026-05-20.
- [x] **Phase 4: gamestate-pydantic** (1/1 plan) — `GameState` → Pydantic `BaseModel` with `.snapshot()`; mirror removed; byte-compatible SSE. Completed 2026-05-22.

</details>

## Progress

| Phase | Milestone | Plans | Status | Completed |
|-------|-----------|-------|--------|-----------|
| 1. Generalist Harness + CLI | v1.0 | 4/4 | Complete | 2026-04-28 |
| 2. backend-dedup | v2.0 | 2/2 | Complete | 2026-05-20 |
| 3. tool-surface-consolidation | v2.0 | 2/2 | Complete | 2026-05-20 |
| 4. gamestate-pydantic | v2.0 | 1/1 | Complete | 2026-05-22 |
