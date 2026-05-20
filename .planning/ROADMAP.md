# Roadmap: virtualGM — Solo TTRPG GM Agent

**v1.0 created:** 2026-04-28 (Phase 1 — generalist viability spike, complete)
**v2.0 created:** 2026-05-19 (Phases 2–4 — backend-simplification)
**Granularity:** coarse
**Coverage (v2.0):** 18/18 requirements mapped (13 deliverables + 5 invariants across 3 phases)

## Core Value

Ship a maintainable, schema-enforced TTRPG GM agent backend that drives the existing web UI without ad-hoc tool sprawl or duplicated state surfaces. `backend/` is the production target; `backend_generalist/` stays archived as v1.0 reference.

## Phases

### Completed (v1.0 — generalist-viability-spike, frozen)

- [x] **Phase 1: Generalist Harness + CLI** — Single-shot delivery of `backend_generalist/` agent, world template, per-session world dir, and stdin/stdout CLI turn loop. Playable end-to-end on a coarse-granularity viability spike. **Verdict: `play passed`** (2026-04-28).

### Active (v2.0 — backend-simplification)

- [x] **Phase 2: backend-dedup** — Tier 2 internal de-duplication in `backend/`: one shared SSE turn-stream core, trimmed system prompt, static ruleset embedded at module load, test-file overlap resolved. No change to the agent tool surface or to the SSE wire format. **Complete 2026-05-20** (2/2 plans; golden-path UI smoke human-verified).
- [ ] **Phase 3: tool-surface-consolidation** — Tier 3 tool surface reduction (~15 → ≤11): merge inventory pair, merge countdown pair, retire `set_boss_battle`, factor level-up out of `award_xp`, replace manual load/unload + 3-section cap with implicit LRU. Every existing in-fiction capability preserved.
- [ ] **Phase 4: gamestate-pydantic** — Tier 4 `GameState` becomes a Pydantic `BaseModel` with `.snapshot()`; the hand-maintained `GameStateSnapshot` mirror in `api/schemas.py` is removed; SSE payloads emit `GameState.snapshot()` directly with byte-compatible JSON for the frontend.

## Phase Details

### Phase 1: Generalist Harness + CLI (v1.0 — complete)
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
  - [x] 01-04-PLAN.md — CLI entry point + turn loop + human playtest checkpoint (CLI-01..04, WORLD-03, PLAY-01..03) — complete 2026-04-28; verdict `play passed`

---

### Phase 2: backend-dedup (v2.0)
**Goal**: After this phase, `backend/` has one shared SSE turn-stream core (not two near-duplicates), a system prompt that no longer re-describes tool signatures, a statically-embedded ruleset (no per-turn dynamic injection), and a resolved overlap between the two `*test_agent*.py` files — all while the frontend's SSE event stream remains byte-compatible for the same turn input.
**Depends on**: Nothing (first phase of v2.0; operates on the existing live `backend/`)
**Requirements**:
  - DEDUP-01 (shared SSE turn-stream core in `api/turn_engine.py`)
  - DEDUP-02 (system prompt no longer enumerates tool signatures)
  - DEDUP-03 (static ruleset embedded at module load; `@gm_agent.instructions add_ruleset` removed; `add_campaign` and `current_game_state` remain dynamic)
  - DEDUP-04 (`backend/agent_test.py` vs `backend/test_agent.py` overlap resolved — consolidated or each given a documented distinct purpose)
  - Invariants (apply to this phase): INV-01, INV-02, INV-03, INV-04, INV-05
**Success Criteria** (what must be TRUE):
  1. Running `git grep` over `backend/api/turn_engine.py` shows the SSE event-emission code paths (`narration`, `thinking`, `pending_action`, `complete`, `error`) implemented exactly once; if `stream_turn` and `stream_deferred_response` still exist, each is ≤ 5 lines of body delegating to the shared core.
  2. Running the FastAPI app and submitting a turn through the React UI (including a deferred dice roll round-trip) produces the same SSE event sequence as before the phase — same event types in the same order, same payload field names — and the dice-prompt UI completes the turn without code changes to `frontend/src/api/client.ts` or `frontend/src/types/index.ts`.
  3. Reading `backend/agent/definition.py` shows the system prompt contains no per-tool signature/argument enumeration; tool-shape documentation lives only in `@gm_agent.tool` docstrings. The static ruleset (`prompts/rulesets/core-ruleset.md`) is loaded once at module load and passed via `instructions=`; `@gm_agent.instructions add_ruleset` is gone; `add_campaign` and `current_game_state` instruction hooks are still present.
  4. The two `*_test_agent.py` test files have a documented disposition: either consolidated into one (the other deleted) or each file's module docstring states its distinct purpose. Whichever pytest entry point existed before still runs after the phase (no test discovery regression).
  5. `backend/cli.py` still starts a session and accepts at least one turn without crashing (INV-03 smoke).
**Out of scope (deferred)**: No change to the agent's registered tool surface (that's Phase 3). No change to `GameState`'s class shape or to `GameStateSnapshot` (that's Phase 4). No change to SSE event types or payload field names (invariant — must not change in this phase). No edits to `backend_generalist/` or to `frontend/`.
**Plans**: 2 plans
  - [x] 02-01-PLAN.md — Shared SSE turn-stream core in turn_engine.py + delete two scratch test files (DEDUP-01, DEDUP-04)
  - [x] 02-02-PLAN.md — Trim system prompt + statically embed ruleset in definition.py, then end-of-phase golden-path UI smoke gate (DEDUP-02, DEDUP-03, INV-01/02/03) — complete 2026-05-20; golden-path UI smoke human-verified

---

### Phase 3: tool-surface-consolidation (v2.0)
**Goal**: After this phase, `backend/agent/tools.py` registers ≤ 11 tools on `gm_agent` (down from ~15) by merging the inventory pair, merging the countdown pair, retiring `set_boss_battle`, factoring level-up out of `award_xp` into a non-tool helper, and replacing the manual `load_campaign_section` / `unload_campaign_section` pair + 3-section cap with implicit LRU caching — with every previously expressible in-fiction capability still expressible.
**Depends on**: Phase 2 (system prompt has already been trimmed to behavior/pacing rules in Phase 2, so the tool-surface diff in this phase reads cleanly against the slimmer prompt and avoids touching `definition.py` simultaneously with the prompt rewrite).
**Requirements**:
  - TOOLS-01 (`add_to_inventory` + `remove_from_inventory` → single tool with `action` arg)
  - TOOLS-02 (`create_countdown` + `update_countdown` → single tool with upsert/absolute-value semantics)
  - TOOLS-03 (`set_boss_battle` removed; boss status becomes an `apply_damage` arg or derived from scene/section state; "Blaze of Glory / Risk It All" branch still fires when applicable)
  - TOOLS-04 (level-up logic factored out of `award_xp` into a non-tool helper, e.g. `_check_level_up`; `award_xp` body shrinks to xp accounting + helper call)
  - TOOLS-05 (manual section load/unload + 3-section cap replaced with implicit LRU; `unload_campaign_section` removed; one `load_campaign_section(section)` tool remains; eviction is automatic)
  - TOOLS-06 (post-Tier-3 total registered tools ≤ 11; no capability silently dropped)
  - Invariants (apply to this phase): INV-01, INV-02, INV-03, INV-04, INV-05
**Success Criteria** (what must be TRUE):
  1. Inspecting `backend/agent/tools.py` (or the tools registered on `gm_agent`) shows ≤ 11 tools registered, with the dropped tools (`remove_from_inventory`, `update_countdown`, `set_boss_battle`, `unload_campaign_section`) absent and their merged replacements present and documented.
  2. Running the React UI through a turn that exercises every consolidation point — adding then removing an inventory item, creating then modifying a countdown, entering a boss battle that triggers the "Blaze of Glory / Risk It All" branch on `apply_damage`, awarding XP that crosses a level-up threshold, and loading a fourth distinct campaign section (forcing LRU eviction of the oldest) — all complete end-to-end with the same SSE event types and payload field names as before the phase. The frontend client code is unchanged.
  3. `award_xp`'s tool body contains only xp accounting plus a call to the level-up helper; the helper itself is not registered as a `@gm_agent.tool`.
  4. After loading more than the previous 3-section cap of campaign sections during one session, only the most-recently-used N sections remain in the agent's accessible section cache; eviction happens implicitly with no tool call required from the agent.
  5. `backend/cli.py` still starts a session and accepts a turn without crashing (INV-03 smoke); `backend_generalist/` is untouched (INV-04); non-`GameState` Pydantic models (`CharacterState`, `EnemyState`, `Stats`, …) are untouched (INV-05).
**Out of scope (deferred)**: No change to `GameState`'s class shape or to `GameStateSnapshot` (that's Phase 4). No change to SSE event types or payload field names (invariant). No new gameplay features, new rulesets, or new campaigns. No edits to `backend_generalist/` or to `frontend/`.
**Plans**: TBD

---

### Phase 4: gamestate-pydantic (v2.0)
**Goal**: After this phase, `GameState` in `backend/game/models.py` is a Pydantic `BaseModel` (not a plain Python class), exposes a `.snapshot()` method, and the hand-maintained `GameStateSnapshot` class in `api/schemas.py` is removed — with `turn_engine.py` emitting `GameState.snapshot().model_dump()` directly into the `game_state` payload of `pending_action` and `complete` SSE events, byte-compatible with what the frontend currently consumes.
**Depends on**: Phase 3 (the tool surface that mutates `GameState` is already smaller and merged, so retyping `GameState` and removing its parallel mirror touches a smaller set of tool call sites).
**Requirements**:
  - STATE-01 (`GameState` is a Pydantic `BaseModel`; runtime-only fields `_event_queue`, `narrations` use `PrivateAttr` or equivalent and do not appear in serialization)
  - STATE-02 (`GameState` exposes `.snapshot()` returning the API-facing view: character + enemies + countdowns + in_combat)
  - STATE-03 (`GameStateSnapshot` in `api/schemas.py` is removed; SSE payloads emit `GameState.snapshot()` via `.model_dump()` directly; frontend receives byte-compatible JSON for `game_state` in `pending_action` / `complete` events)
  - Invariants (apply to this phase): INV-01, INV-02, INV-03, INV-04, INV-05
**Success Criteria** (what must be TRUE):
  1. `git grep -n "class GameStateSnapshot" backend/` returns no results; `backend/api/schemas.py` no longer defines the mirror class, and the only place `game_state` payloads are constructed is via `GameState.snapshot().model_dump()`.
  2. `GameState` in `backend/game/models.py` is declared as `class GameState(BaseModel): …`; `_event_queue` and `narrations` are `PrivateAttr`-flavored and do not appear in `.model_dump()` output.
  3. Running the FastAPI app and submitting a turn through the React UI produces, for the `game_state` key of every `pending_action` and `complete` SSE event, JSON that is byte-identical (same field set, same types, same nesting) to the payload produced before the phase, for the same turn input. The frontend handles it with zero code change.
  4. `GameState.snapshot()` returns exactly the API-facing view (character + enemies + countdowns + in_combat) — no private/runtime fields leak; verified by inspecting the snapshot of a session that has non-empty `_event_queue` and `narrations`.
  5. `backend/cli.py` still starts a session and accepts a turn without crashing (INV-03 smoke); `backend_generalist/` is untouched (INV-04); non-`GameState` Pydantic models are untouched (INV-05).
**Out of scope (deferred / different milestone)**: No further tool-surface changes (those landed in Phase 3). No SSE wire-format changes (invariant). No changes to `CharacterState`, `EnemyState`, `Stats`, or other Pydantic models. No production hardening (auth / rate limiting / telemetry). No `backend_generalist/` or `frontend/` edits. Auto eval harness for refactor parity is out of milestone scope — user verifies via the golden-path web UI smoke test.
**Plans**: TBD

## Progress

| Phase | Plans Complete | Status | Completed |
|-------|----------------|--------|-----------|
| 1. Generalist Harness + CLI (v1.0) | 4/4 | Complete | 2026-04-28 |
| 2. backend-dedup (v2.0) | 2/2 | Complete | 2026-05-20 |
| 3. tool-surface-consolidation (v2.0) | 0/TBD | Not started | — |
| 4. gamestate-pydantic (v2.0) | 0/TBD | Not started | — |

## Coverage

### v1.0 (complete)

All 14 v1.0 requirements mapped to Phase 1. No orphans, no duplicates.

| Category | Requirements | Phase |
|----------|--------------|-------|
| Harness  | HARN-01, HARN-02, HARN-03, HARN-04 | 1 |
| World    | WORLD-01, WORLD-02, WORLD-03 | 1 |
| CLI      | CLI-01, CLI-02, CLI-03, CLI-04 | 1 |
| Playability | PLAY-01, PLAY-02, PLAY-03 | 1 |

### v2.0 (active)

All 13 v2.0 deliverable requirements mapped to exactly one phase. INV-01..INV-05 apply to every v2.0 phase (verified per-phase, not a separate phase).

| Category | Requirements | Phase |
|----------|--------------|-------|
| Dedup (Tier 2) | DEDUP-01, DEDUP-02, DEDUP-03, DEDUP-04 | 2 |
| Tools (Tier 3) | TOOLS-01, TOOLS-02, TOOLS-03, TOOLS-04, TOOLS-05, TOOLS-06 | 3 |
| State (Tier 4) | STATE-01, STATE-02, STATE-03 | 4 |
| Invariants | INV-01, INV-02, INV-03, INV-04, INV-05 | 2, 3, 4 (all) |

**Coverage check:** 13/13 deliverables mapped to exactly one phase; 5/5 invariants attached to all three v2.0 phases. No orphans, no duplicate phase assignments.

### Rationale for phase ordering

- **Phase 2 before Phase 3:** Phase 3 edits `agent/tools.py` and references the system prompt. Trimming the prompt in Phase 2 first means Phase 3's diff is purely about tool merging, not prompt rewriting at the same time — each phase's diff stays readable and the smoke-test signal stays attributable.
- **Phase 3 before Phase 4:** Phase 4 retypes `GameState`, which several tools mutate. Doing it after the tool surface is already smaller (and the level-up helper has been factored out) means fewer call sites to migrate when `GameState` becomes a `BaseModel`.
- **Each phase smoke-tested against the same frontend invariant:** INV-01 (SSE wire format byte-compatible) is the hard contract. INV-02 (full turn including deferred dice roll completes) and INV-03 (CLI still starts) are the per-phase smoke gates. INV-04 (no edits to `backend_generalist/`) and INV-05 (no edits to other Pydantic models) bound the blast radius.

---
*Roadmap created (v1.0): 2026-04-28*
*Roadmap extended (v2.0): 2026-05-19 — added Phases 2–4 for backend-simplification.*
