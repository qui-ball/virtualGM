---
phase: 04-gamestate-pydantic-v2-0
reviewed: 2026-05-22T00:00:00Z
depth: standard
files_reviewed: 4
files_reviewed_list:
  - backend/game/models.py
  - backend/game/test_models.py
  - backend/api/turn_engine.py
  - backend/api/schemas.py
findings:
  critical: 0
  warning: 0
  info: 2
  total: 4
status: clean
---

# Phase 4: Code Review Report

**Reviewed:** 2026-05-22
**Depth:** standard
**Files Reviewed:** 4
**Status:** clean

## Summary

Internal type/serialization refactor: `GameState` promoted to a Pydantic `BaseModel`
with a hand-built `.snapshot()`, `GameStateSnapshot`/`TurnResponse` deleted from
`schemas.py`, and turn_engine's two SSE call sites repointed to
`session.game_state.snapshot()`. The documented design decisions (D-01..D-05) are
implemented correctly and were verified against the live code: removed classes are
gone, both call sites use `.snapshot()` with no trailing `.model_dump()` (D-02), and
`narrations`/`_event_queue` are correctly excluded from both `model_dump()` and
`snapshot()` (verified at runtime, including the non-empty-narrations case).

No security regressions: this phase adds no new inputs, endpoints, or attack surface,
and the threat-model leak vectors (T-04-01) are closed by `exclude=True` and
`PrivateAttr`. The wire format is byte-identical, so the untouched frontend contract
holds.

Two correctness/robustness issues were found around the hand-built snapshot returning
live references instead of copies, plus minor quality items. None block shipping for
the current call pattern, but both warnings are latent traps for the next caller.

## Warnings

> **RESOLVED (2026-05-26):** Both WR-01 and WR-02 were fixed.
> - WR-01: `GameState.snapshot()` now returns `dict(self.countdowns)`, so the
>   snapshot is self-contained (no live-state aliasing); JSON output stays
>   byte-identical (D-02 preserved).
> - WR-02: Added `test_snapshot_byte_compat_with_old_gamestatesnapshot_mirror` in
>   `backend/game/test_models.py`, which reconstructs the deleted
>   `GameStateSnapshot` mirror locally and asserts canonical-JSON equivalence to
>   `snapshot()`, pinning INV-01. Suite is now 10 tests, all green.
>
> The two Info items below remain open but are out of scope for this fix pass.

### WR-01: `snapshot()` returns live references to mutable state (`countdowns` aliasing)

**File:** `backend/game/models.py:165-170`
**Issue:** The hand-built dict copies `self.pc.model_dump()` and rebuilds `enemies`
via a comprehension (both produce fresh dicts), but `countdowns` is passed through by
reference: `"countdowns": self.countdowns`. Verified at runtime —
`gs.snapshot()["countdowns"] is gs.countdowns` is `True`, and mutating the returned
dict mutates live game state. The old `GameStateSnapshot(...).model_dump()` path
produced a defensive *copy* (confirmed: old-mirror `model_dump()["countdowns"] is
gs.countdowns` is `False`). So this is a behavioral change from the pre-phase code:
JSON output is byte-identical (D-02 holds), but the returned object is no longer
isolated from live state. Today both call sites immediately `put_nowait` the dict onto
an SSE queue and never mutate it, so no live bug fires — but any future caller that
reads-then-mutates a snapshot (a common, reasonable assumption for a method named
"snapshot") will silently corrupt `GameState.countdowns`.
**Fix:** Return a shallow copy so the snapshot is self-contained, matching the old
copy semantics:
```python
return {
    "character": self.pc.model_dump() if self.pc else None,
    "enemies": {k: v.model_dump() for k, v in self.enemies.items()},
    "countdowns": dict(self.countdowns),
    "in_combat": self.in_combat,
}
```

### WR-02: No regression test pins the byte-compat / no-`model_dump()` (D-02) contract

**File:** `backend/game/test_models.py:43-108`
**Issue:** The summary states byte-compat was checked manually ("reconstructing the old
`GameStateSnapshot(...).model_dump()` output and asserting `json.dumps(...) ==
json.dumps(...)`"), but that assertion does not exist in the committed test suite. The
single most important invariant of this phase — that `snapshot()` output is
byte-identical to the removed mirror (INV-01, the untouched-frontend contract) — has no
automated guard. A future edit to `snapshot()` (e.g., reordering keys is fine for JSON,
but renaming a key, dropping `pc->character`, or changing nested `model_dump()`
behavior) would pass all current tests yet silently break the frontend. The tests cover
shape and key names well, but not equivalence to the prior wire format.
**Fix:** Add a test that constructs a fully populated `GameState` (pc + enemy +
countdown + in_combat) and asserts `snapshot()` equals a hardcoded expected dict (or
`json.dumps(snapshot(), sort_keys=True)` equals a frozen golden string), so any drift
from the byte-compat contract fails CI.

## Info

### IN-01: `snapshot()` return type annotated as bare `dict`

**File:** `backend/game/models.py:159`
**Issue:** `def snapshot(self) -> dict:` loses the known structure. The return shape is
fixed and contractual (four keys feeding a typed frontend interface), so a precise type
aids callers and static checkers.
**Fix:** Annotate as `-> dict[str, Any]` (minimum) or define a `TypedDict` mirroring the
frontend `GameStateSnapshot` interface for full structural typing. Low priority.

### IN-02: Test uses `object()` sentinel where field is typed `asyncio.Queue | None`

**File:** `backend/game/test_models.py:94`, `121`
**Issue:** `gs._event_queue = object()` exercises that `PrivateAttr` accepts arbitrary
assignment without validation (intentional per D-04/D-05), which is fine. But it does
not exercise the actual runtime usage (`gs._event_queue = asyncio.Queue()` as done in
turn_engine.py:77). The test proves "assignment doesn't raise" but not "a real queue
round-trips," leaving the realistic path uncovered.
**Fix:** Optionally assign a real `asyncio.Queue()` in one assertion to mirror
production usage. Cosmetic — current coverage is adequate for the D-04 invariant.

---

_Reviewed: 2026-05-22_
_Reviewer: Claude (gsd-code-reviewer)_
_Depth: standard_
