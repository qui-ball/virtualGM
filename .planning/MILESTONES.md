# Milestones

## v2.0 backend-simplification (Shipped: 2026-05-26)

**Delivered:** Simplified the live `backend/` stack in three verifiable tiers — de-duplication, tool-surface consolidation, and `GameState` typing — while holding the frontend SSE wire format byte-compatible throughout.

**Scope:** 3 phases (2–4), 5 plans, 5 tasks. (Phase 1 belongs to the v1.0 generalist-viability spike.)

**Stats:** 34 commits · 9 source files changed · +348 / −261 LOC · 2026-05-20 → 2026-05-26.

**Key accomplishments:**

- **De-duplicated the SSE turn-stream (Phase 2):** collapsed the two near-identical turn-stream generators in `turn_engine.py` into one shared `_stream_core` helper with thin delegating wrappers; removed two leftover scratch test files.
- **Trimmed the GM prompt + static ruleset (Phase 2):** removed per-tool signature enumeration and the literal `narrate()` reference from the system prompt, and statically embedded `core-ruleset.md` at module load (dropping the dynamic `add_ruleset` hook).
- **Consolidated the tool surface 17 → 14 (Phase 3):** merged the inventory pair, merged the countdown pair, retired `set_boss_battle` (relocated onto `apply_damage(is_boss=True)` with auto-clear on last-enemy removal), and factored level-up out of `award_xp` into a non-tool helper — every in-fiction capability preserved.
- **Unified the state model (Phase 4):** promoted `GameState` to a Pydantic `BaseModel` with a hand-built `.snapshot()`, removed the duplicate `GameStateSnapshot` mirror and dead `TurnResponse`, and repointed both SSE call sites — proven byte-identical output (D-02).
- **Held the frontend contract invariant (INV-01):** golden-path deferred-dice turns human-verified through the React UI with zero frontend edits after every phase; Phase 4's byte-compat also pinned by an automated regression test.

**Known deferred items at close:** 3 (see STATE.md Deferred Items) — all are already-shipped quick tasks flagged only for missing status metadata.

---
