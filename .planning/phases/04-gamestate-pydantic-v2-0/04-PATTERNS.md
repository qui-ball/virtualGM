# Phase 4: gamestate-pydantic (v2.0) - Pattern Map

**Mapped:** 2026-05-21
**Files analyzed:** 3 modified (no new files)
**Analogs found:** 3 / 3 (all in-repo)

> Surgical refactor of the live `backend/` stack. No new files. The "analogs" here are sibling code already in the same files — the BaseModel idiom `GameState` must adopt, and the exact `_snapshot()` body that lifts into `GameState.snapshot()`. Favor a minimal diff (see CONTEXT D-01..D-06); no speculative refactors.

## File Classification

| Modified File | Role | Data Flow | Closest Analog | Match Quality |
|---------------|------|-----------|----------------|---------------|
| `backend/game/models.py` (`GameState` @ :129) | model (state container) | transform (`.snapshot()`) + in-place mutation | `CharacterState`/`EnemyState`/`Stats` in same file (:54-126) | exact (sibling models, same file) |
| `backend/api/turn_engine.py` (`_snapshot` @ :15-22, calls :57/:69, import :11) | service (SSE emitter) | event-driven / streaming | self — relocate existing `_snapshot()` body into `GameState.snapshot()` | exact (lift-and-relocate) |
| `backend/api/schemas.py` (delete `GameStateSnapshot` :38, `TurnResponse` :45) | schema (deletion) | n/a | n/a (removal) | n/a |

## Pattern Assignments

### `backend/game/models.py` — promote `GameState` to `BaseModel` (model, transform + mutation)

**Analog:** `CharacterState` / `EnemyState` / `Stats`, same file (`backend/game/models.py:54-126`). They are the authoritative `BaseModel` + `Field(...)` idiom this class must follow (CONTEXT "Established Patterns"; INV-05 says do NOT touch them).

**BaseModel + Field idiom to copy** (`models.py:54-66`, `:115-126`):
```python
from pydantic import BaseModel, Field  # already imported at models.py:6

class Stats(BaseModel):
    might: int = Field(default=0, ge=-5, le=5, description="...")

class EnemyState(BaseModel):
    name: str = Field(description="Enemy name/identifier")
    conditions: list[ConditionName] = Field(
        default_factory=list, description="Active conditions"
    )
```
Note the two default styles already in use: literal `default=...` for scalars, `Field(default_factory=...)` for mutable containers (`list`/`dict`). `GameState` must reuse exactly this.

**Source `__init__` field set to mirror as fields** (`models.py:132-158`) — every field needs a default so no-arg `GameState()` keeps working (Discretion item; call sites below):
```python
def __init__(self):
    self.pc: CharacterState | None = None
    self.enemies: dict[str, EnemyState] = {}
    self.time_counter: int | None = None
    self.countdowns: dict[str, int] = {}
    self.in_combat: bool = False
    self.is_boss_battle: bool = False
    self.initiative_order: list[str] = []
    self.current_turn_index: int = 0
    self.campaign_dir: str | None = None
    self.loaded_sections: dict[str, str] = {}
    self.max_loaded_sections: int = 3
    self.narrations: list[str] = []                       # → Field(default_factory=list, exclude=True)  [D-03]
    self._event_queue: asyncio.Queue | None = None        # → PrivateAttr(default=None)                  [D-04]
```
Mapping rule: `None`/scalar → literal default; `{}`/`[]` → `default_factory=dict|list`; `narrations` keeps its **public name** with `Field(default_factory=list, exclude=True)` (D-03); `_event_queue` becomes `PrivateAttr(default=None)` (D-04, import `PrivateAttr` from `pydantic`). No `validate_assignment`, no `arbitrary_types_allowed` (D-05; private attrs aren't in the schema).

**`.snapshot()` method body** — lift verbatim from `turn_engine._snapshot()` (`turn_engine.py:15-22`), applying the `gs.` → `self.` rebind and dropping the `GameStateSnapshot(...).model_dump()` wrapper in favor of a hand-built dict (D-01). Target shape:
```python
def snapshot(self) -> dict:
    return {
        "character": self.pc.model_dump() if self.pc else None,   # pc → "character" rename preserved
        "enemies": {k: v.model_dump() for k, v in self.enemies.items()},
        "countdowns": self.countdowns,
        "in_combat": self.in_combat,
    }
```
The four keys and the `pc → character` rename ARE the byte-compat contract (see byte-compat reference below). The old code got the rename "for free" via `GameStateSnapshot(character=gs.pc, ...).model_dump()`; the hand-built dict must reproduce it explicitly.

**Mutation/attribute-access semantics that MUST survive the retype** (drives D-05 — no `validate_assignment`). The agent tools and CLI touch `GameState` like a plain object; a plain `BaseModel` preserves all of these, but verify each still works:
```python
# attribute reassignment (cli.py:44, app.py:44, tools.py:266)
gs.pc = create_player_character()
ctx.deps.pc.hp = max(0, ctx.deps.pc.hp - amount)
# in-place dict mutation (tools.py:211, :231)
ctx.deps.enemies[enemy_id] = enemy
del ctx.deps.enemies[enemy_id]
# in-place list mutation on a nested model + on narrations (tools.py:316, :40)
ctx.deps.pc.conditions.append(condition)
ctx.deps.narrations.append(text)
# private-attr runtime assignment/read (turn_engine.py:87/105, tools.py:42)
gs._event_queue = queue
if ctx.deps._event_queue is not None: ...
```

---

### `backend/api/turn_engine.py` — repoint snapshot producer (service, event-driven)

**Analog:** the function being replaced — `_snapshot()` at `turn_engine.py:15-22` (the lift-source for `GameState.snapshot()` above).

**Current code being removed** (`:11`, `:15-22`):
```python
from api.schemas import GameStateSnapshot, PendingAction        # :11 — drop GameStateSnapshot, keep PendingAction

def _snapshot(session: Session) -> dict:                        # :15-22 — delete entirely
    gs = session.game_state
    return GameStateSnapshot(
        character=gs.pc,
        enemies=gs.enemies,
        countdowns=gs.countdowns,
        in_combat=gs.in_combat,
    ).model_dump()
```

**Two call sites to repoint** (`:57`, `:69`) — replace `_snapshot(session)` with `session.game_state.snapshot()`:
```python
# :52-60 (pending_action event)
"game_state": session.game_state.snapshot(),
# :65-72 (complete event)
"game_state": session.game_state.snapshot(),
```
Note D-02 deviation from ROADMAP STATE-03: call `.snapshot()` directly (returns a dict), NOT `.snapshot().model_dump()`. Output is byte-identical; flag this in the plan/commit per the Phase-3 habit. `PendingAction` import stays.

---

### `backend/api/schemas.py` — delete dead mirror (schema removal)

**No analog needed — pure deletion.** Confirmed via grep:
- `class GameStateSnapshot` (`:38-42`) — referenced only by `turn_engine.py:11/17` (removed above) and dead `TurnResponse:49`.
- `class TurnResponse` (`:45-50`) — DEAD: `git grep TurnResponse -- backend/` returns only its own definition (no import, no construction anywhere). It is the *only* remaining `GameStateSnapshot` consumer. Delete it too (D / canonical_refs) to satisfy success criterion #1 (`git grep "class GameStateSnapshot"` returns nothing with no dangling reference).
- After deletion, prune the now-unused `Field` import only if nothing else in the file uses it — `GameStateSnapshot` and `TurnResponse` use `Field(default_factory=...)`; verify remaining classes (none currently use `Field`) before removing the import. `CharacterState`, `EnemyState`, `ConditionName`, `DiceType` imports (`:5`) stay if still referenced (`PendingAction` uses `DiceType`); `CharacterState`/`EnemyState`/`ConditionName` become unused once `GameStateSnapshot` is gone — prune them from the import line.

## Shared Patterns

### Pydantic field-default idiom (mutable vs scalar)
**Source:** `backend/game/models.py:54-126` (`Stats`/`CharacterState`/`EnemyState`)
**Apply to:** every field in the retyped `GameState`
```python
scalar:    field: int = Field(default=0, ...)        # or bare `field: bool = False`
container: field: list[X] = Field(default_factory=list)
           field: dict[str, X] = Field(default_factory=dict)
```

### Hand-built snapshot dict (the byte-compat contract)
**Source:** `turn_engine.py:15-22` (existing `_snapshot`)
**Apply to:** `GameState.snapshot()` only — sole producer of the `game_state` SSE payload (CONTEXT Integration Points)
Keys: `character` (renamed from `pc`), `enemies`, `countdowns`, `in_combat`. Nested models serialized via `.model_dump()`.

## Byte-Compat Reference (the snapshot MUST match this; frontend untouched per INV-01)

**Source:** `frontend/src/types/index.ts:51-56`
```typescript
export interface GameStateSnapshot {
  character: CharacterState | null;
  enemies: Record<string, EnemyState>;
  countdowns: Record<string, number>;
  in_combat: boolean;
}
```
The `.snapshot()` dict's four keys, the `character` name (NOT `pc`), and the `null`-able character map exactly to this. `CharacterState`/`EnemyState` field shapes (`index.ts:21-49`) are produced by `.model_dump()` on the existing untouched models — no change.

## No Analog Found

None. All three files have in-repo analogs (sibling BaseModels for `GameState`; the function being relocated for `turn_engine`; deletion needs no analog). RESEARCH.md does not exist for this phase — none needed.

## Out-of-Scope Reference (do NOT modify)

| File | Why it appears | Disposition |
|------|----------------|-------------|
| `backend/recording.py:25` `_serialize_game_state` | reads ~10 `GameState` attrs by name (`gs.pc`, `gs.time_counter`, `gs.is_boss_battle`, `gs.initiative_order`, `gs.current_turn_index`, `gs.campaign_dir`, `gs.loaded_sections`, `gs.enemies`, `gs.countdowns`, `gs.in_combat`) | D-06: leave untouched; the new BaseModel must keep every public field name/type so this still compiles. It is a *fuller* recorder dump, not the SSE snapshot. |
| `backend/agent/tools.py`, `backend/agent/definition.py` | mutate/read `ctx.deps` (`GameState`) in place | not edited; used to verify mutation semantics survive (see model section) |
| `frontend/src/types/index.ts`, `frontend/src/api/client.ts` | SSE contract | INV-01: untouched; used only as byte-compat reference |

## Metadata

**Analog search scope:** `backend/game/`, `backend/api/`, `backend/agent/`, `backend/cli.py`, `backend/app.py`, `backend/recording.py`, `frontend/src/types/`
**Files scanned:** 8 read in full, ~3 grepped for usage
**Skills loaded:** none (`.claude/skills/` / `.agents/skills/` absent)
**Pattern extraction date:** 2026-05-21
