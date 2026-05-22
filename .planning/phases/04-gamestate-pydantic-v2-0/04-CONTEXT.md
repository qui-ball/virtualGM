# Phase 4: gamestate-pydantic (v2.0) - Context

**Gathered:** 2026-05-21
**Status:** Ready for planning

<domain>
## Phase Boundary

Tier 4 state-model unification in `backend/` (the live production stack). Promote `GameState` in `backend/game/models.py` from a plain Python class to a Pydantic `BaseModel`, give it a `.snapshot()` method returning the API-facing view, and **remove** the hand-maintained `GameStateSnapshot` mirror in `backend/api/schemas.py`. `turn_engine.py` then emits the snapshot directly into the `game_state` payload of `pending_action` and `complete` SSE events — byte-identical to what the frontend consumes today.

The one non-trivial transform preserved end-to-end: the `pc → character` key rename that today's `_snapshot()` performs (`turn_engine.py:17`).

Unchanged invariants: SSE event types and payload field names are the hard contract — byte-compatible, frontend untouched (INV-01). No edits to `backend_generalist/` (INV-04). Non-`GameState` Pydantic models (`CharacterState`, `EnemyState`, `Stats`, …) untouched (INV-05). CLI still starts + accepts a turn (INV-03 smoke). Verification is the golden-path web UI smoke test — no auto eval harness this milestone.

</domain>

<decisions>
## Implementation Decisions

### STATE-02 — `.snapshot()` shape & return type
- **D-01:** `.snapshot()` returns a **plain dict** built explicitly inside the method — lifting today's `_snapshot()` body (`turn_engine.py:15-22`) into `GameState`: `{"character": self.pc.model_dump() if self.pc else None, "enemies": {k: v.model_dump() ...}, "countdowns": ..., "in_combat": ...}`. The mirror is fully removed — no second model class anywhere. No serialization-alias magic on `pc`.
- **D-02:** **Roadmap-wording deviation, flagged:** ROADMAP STATE-03 says payloads emit `GameState.snapshot().model_dump()`. Since `.snapshot()` now returns a dict, `turn_engine.py` calls `.snapshot()` directly (no trailing `.model_dump()`). The emitted JSON is byte-identical; only the literal call form differs. (Matches the Phase-3 pattern of flagging roadmap drift explicitly rather than silently deviating.) Considered & rejected: (a) `self.model_dump(by_alias=True, include={...})` with a `serialization_alias="character"` on `pc` — clever but adds a surprising alias side-effect to `pc`; (b) relocating a small snapshot `BaseModel` into `models.py` and keeping `.snapshot().model_dump()` — rejected because it just *moves* the mirror instead of removing it.

### STATE-01 — Runtime / private field handling
- **D-03:** `narrations` stays a **public field with `Field(exclude=True)`** — keeps the attribute name `narrations` so existing call sites work unchanged (`turn_engine.py:86` `gs.narrations.clear()`, `cli.py:131` `list(game_state.narrations)`); `exclude=True` keeps it out of any `.model_dump()`. Zero call-site churn. STATE-01 explicitly permits "PrivateAttr **or equivalent**" — this is the equivalent. Rejected: renaming to `_narrations` PrivateAttr (more literal to the wording but touches more files for no functional gain).
- **D-04:** `_event_queue` becomes a true Pydantic `PrivateAttr` (default `None`) — it is already underscore-prefixed, holds a non-serializable `asyncio.Queue`, and is assigned/cleared at runtime by `_stream_core` (`turn_engine.py:87,105`). PrivateAttr supports runtime assignment and is excluded from serialization; no `arbitrary_types_allowed` needed since private attrs aren't part of the schema.

### Validation posture
- **D-05:** Plain `BaseModel` — **no `validate_assignment`**. Fields are validated at construction; in-place mutation (`gs.pc = ...`, `gs.in_combat = True`, `gs.countdowns[name] = v`, `gs.enemies[name] = ...`) behaves like today's plain class. Construction-time validation is already a strict gain over the plain class. `validate_assignment=True` was rejected: it adds regression risk (a tool assignment that worked before could now raise) for little benefit — it wouldn't even catch the in-place *dict/list* mutations most tools perform (those don't trigger attribute-assignment validation).

### recording.py disposition
- **D-06:** Leave `_serialize_game_state` (`recording.py:25`) **untouched**. It is a different, fuller state dump (includes `time_counter`, `is_boss_battle`, `initiative_order`, `current_turn_index`, `campaign_dir`, `loaded_sections`) for the JSONL dataset recorder — it is NOT the SSE snapshot and is outside STATE-01/02/03 scope. Touching it would expand the diff and risk changing recorder output shape.

### Claude's Discretion
- Construction defaults so `GameState()` (no-arg) still works everywhere it's instantiated (`cli.py:43`, `session.py:37`, `app.py:45`): every field needs a default (`pc=None`, `enemies`/`countdowns`/etc. via `default_factory`, scalars with literal defaults). Mirror the current `__init__` field set exactly.
- Whether `.snapshot()` lives as an instance method (recommended) and any small private helper it uses.
- Exact placement of the `Field`/`PrivateAttr` declarations and field ordering within the class.

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Planning artifacts
- `.planning/ROADMAP.md` — Phase 4 goal, the 5 success criteria, out-of-scope, v2.0 invariants INV-01..05. **NOTE:** STATE-03's literal `GameState.snapshot().model_dump()` is superseded by D-01/D-02 here — `.snapshot()` returns a dict and `turn_engine` calls `.snapshot()` directly (byte-identical output).
- `.planning/REQUIREMENTS.md` — STATE-01, STATE-02, STATE-03 + INV-01..05 full text.
- `.planning/PROJECT.md` — milestone framing; wire format is the invariant; "auto eval harness out of scope — user verifies via golden-path web UI smoke".

### Files this phase edits
- `backend/game/models.py` — `GameState` (`:129`) becomes a `BaseModel`; add `.snapshot()` (D-01); `narrations` → `Field(exclude=True)` (D-03); `_event_queue` → `PrivateAttr` (D-04); preserve no-arg construction. Do NOT touch `CharacterState`/`EnemyState`/`Stats` (INV-05).
- `backend/api/schemas.py` — **delete** `class GameStateSnapshot` (`:38`). Also delete (or retype) `class TurnResponse` (`:45`) — it's the only other reference to `GameStateSnapshot` (`game_state: GameStateSnapshot`) and is **dead code** (defined but never imported/used anywhere — confirmed via grep). Deleting it is the clean, lowest-blast-radius move and is required to satisfy success criterion #1 (`git grep "class GameStateSnapshot"` returns nothing without leaving a dangling reference).
- `backend/api/turn_engine.py` — replace `_snapshot()` (`:15-22`) and its two call sites (`:57`, `:69`) with `session.game_state.snapshot()`; remove the `GameStateSnapshot` import (`:11`).

### Contract / invariant references (must NOT change)
- `frontend/src/api/client.ts` — SSE event consumer; INV-01 says it needs no edits.
- `frontend/src/types/index.ts` — SSE payload type defs (the `game_state` shape: `character`, `enemies`, `countdowns`, `in_combat`); INV-01 says it needs no edits. Use this as the byte-compat reference for the snapshot shape.

### Call sites to keep working
- `backend/app.py` (`:45`) — `store.create(game_state=gs)`; FastAPI routes (INV-02 full-turn smoke).
- `backend/cli.py` (`:43`, `:131`) — `GameState()` construction + `list(game_state.narrations)` (INV-03 smoke).
- `backend/game/session.py` (`:37`) — `game_state or GameState()`.
- `backend/recording.py` (`:25`) — reads `gs.*` attributes directly; left untouched (D-06) but must keep compiling against the new field set.

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `_snapshot()` (`turn_engine.py:15-22`) is the exact body that moves into `GameState.snapshot()` — including the `character=gs.pc` rename. Lift-and-relocate, not rewrite.
- `frontend/src/types/index.ts` is the authoritative byte-compat target for the snapshot shape.

### Established Patterns
- `CharacterState`, `EnemyState`, `Stats` are already `BaseModel`s with `Field(...)` declarations — `GameState` should follow the same idiom for its field declarations.
- Tools mutate `ctx.deps` (the `GameState`) in place and read its attributes directly — the new `BaseModel` must preserve attribute access and in-place mutation semantics (drives D-05: no `validate_assignment`).

### Integration Points
- `game_state` SSE payloads are produced ONLY through `_snapshot()` today (two call sites in `turn_engine.py`) — after this phase, only through `GameState.snapshot()`. No other producer of that payload exists.
- `GameState` is constructed no-arg in three places (`cli.py:43`, `session.py:37`, `app.py:45`) — all fields must have defaults.
- `recording.py:_serialize_game_state` reads ~10 `GameState` attributes by name; renaming/removing any public field would break it — another reason `narrations` keeps its public name (D-03) and the other fields stay as-is.

</code_context>

<specifics>
## Specific Ideas

- User consistently took the lowest-blast-radius option (hand-built dict over alias magic, `Field(exclude=True)` over PrivateAttr-rename, plain BaseModel over `validate_assignment`, leave `recording.py` alone). Planner should favor a minimal surgical diff: retype `GameState`, add `.snapshot()`, delete `GameStateSnapshot` + dead `TurnResponse`, repoint `turn_engine`. No speculative refactors.
- Mirror the Phase-3 habit: where this phase deviates from the roadmap's literal text (D-02), flag it explicitly in artifacts rather than silently diverging.

</specifics>

<deferred>
## Deferred Ideas

- **`validate_assignment=True` / stronger mutation enforcement on `GameState`** — declined this phase (D-05) to minimize regression risk. Candidate for a future hardening pass if class-invalid mutations become a real problem.
- **Refactoring `recording.py:_serialize_game_state` onto the new `BaseModel`** — declined (D-06) to keep the diff tight. Could simplify later once the snapshot/recorder shapes are intentionally reconciled.
- None of the above are scope creep for Phase 4; they are explicitly out of the milestone (production hardening / recorder rework).

</deferred>

---

*Phase: 4-gamestate-pydantic-v2-0*
*Context gathered: 2026-05-21*
