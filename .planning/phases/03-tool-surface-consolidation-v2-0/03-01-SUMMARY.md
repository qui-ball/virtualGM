---
phase: 03-tool-surface-consolidation-v2-0
plan: 01
subsystem: backend/agent (tool surface)
tags: [tools, refactor, consolidation, pydantic-ai]
requires:
  - "Phase 2 trimmed prompt (definition.py relies on docstrings for tool shape, DEDUP-02)"
provides:
  - "modify_inventory(action, item) — merged inventory tool (TOOLS-01)"
  - "set_countdown(name, value) — upsert countdown tool (TOOLS-02)"
  - "apply_damage(is_boss=False) flag write + remove_enemy auto-clear (TOOLS-03)"
  - "_check_level_up(pc) non-tool helper; slimmer award_xp (TOOLS-04)"
  - "gm_agent registers 14 tools, down from 17 (TOOLS-06)"
affects:
  - "backend/agent/tools.py"
  - "backend/agent/definition.py"
  - ".planning/ROADMAP.md (TOOLS-05 deferred, baseline corrected)"
  - ".planning/REQUIREMENTS.md (TOOLS-05 deferred, TOOLS-06 <=14)"
tech-stack:
  added: []
  patterns:
    - "Literal-typed action arg for merged tool (typing.Literal added to tools.py)"
    - "Absolute-value upsert for countdowns (no delta/clamp)"
    - "Combat-end side-effect: auto-clear is_boss_battle when enemies dict empties"
    - "Non-tool module-level helper factored out of a registered tool"
key-files:
  created:
    - ".planning/phases/03-tool-surface-consolidation-v2-0/03-01-SUMMARY.md"
  modified:
    - "backend/agent/tools.py"
    - "backend/agent/definition.py"
    - ".planning/ROADMAP.md"
    - ".planning/REQUIREMENTS.md"
decisions:
  - "Kept GameState.is_boss_battle field unchanged (D-07; class shape is Phase 4)"
  - "Auto-clear boss flag in remove_enemy (only structured combat-end signal — D-08b)"
  - "TOOLS-05 (implicit-LRU) descoped this phase per D-09; load/unload left as-is"
  - "Tool-count target corrected 17 -> <=14 per D-10 (no over-merging beyond named consolidations)"
metrics:
  duration: "~6 min"
  completed: "2026-05-20"
  tasks: 3
  files-changed: 4
---

# Phase 3 Plan 01: tool-surface-consolidation Summary

Merged the inventory and countdown tool pairs, retired `set_boss_battle` (folding the flag write onto `apply_damage(is_boss=...)` with auto-clear when combat ends), and factored level-up out of `award_xp` into a non-tool `_check_level_up` helper — taking the live `backend/` tool surface from 17 to 14 registered tools with no in-fiction capability dropped and the SSE wire format untouched.

## What Was Built

- **TOOLS-01 — `modify_inventory(action, item)`**: Single `@gm_agent.tool` replacing `add_to_inventory` + `remove_from_inventory`. Branches on `action: Literal["add","remove"]`. Shared `pc is None` guard; `remove` keeps the not-present `ModelRetry` listing current inventory; both branches return the updated inventory. Added `from typing import Literal` to `tools.py`.
- **TOOLS-02 — `set_countdown(name, value)`**: Single tool replacing `create_countdown` + `update_countdown`, using absolute-value upsert (`ctx.deps.countdowns[name] = value`). Dropped the create "already exists" and update "not found" `ModelRetry`s (upsert makes neither an error). Kept only the `value < 0` guard; `value == 0` reports "(TRIGGERED!)". Preserves the ⏱️ emoji-log convention.
- **TOOLS-03 — boss-flag relocation**: Deleted `set_boss_battle`. Added `is_boss: bool = False` to `apply_damage`; when `True`, sets `ctx.deps.is_boss_battle = True`. The PC-at-0-HP Blaze-of-Glory read branch is unchanged. Added an auto-clear side-effect in `remove_enemy`: when the last enemy is removed, `is_boss_battle` is reset to `False` (D-08b) so a stale flag cannot fire Blaze-of-Glory in a later non-boss fight.
- **TOOLS-04 — `_check_level_up(pc)` helper**: Module-level non-tool function (no decorator) just above `award_xp`. Detects/applies a single level-up via `XP_THRESHOLDS`, logs the 🎉 line, returns the player-facing message or `None`. `award_xp` shrinks to xp accounting + `level_up_msg = _check_level_up(pc); if level_up_msg: result += level_up_msg`. Added `CharacterState` to the `game.models` import for the helper annotation.
- **definition.py**: Added one terse line under Combat Rules Summary documenting countdown-tick semantics (call `set_countdown` with the new absolute value, one less than current) per D-06.
- **TOOLS-05 / TOOLS-06 doc reconciliation (Task 3)**: ROADMAP and REQUIREMENTS updated so TOOLS-05 (implicit-LRU) reads DEFERRED per D-09, the tool-count baseline is corrected from "~15 → ≤11" to "17 → ≤14" per D-10, and ROADMAP success-criterion #4 (automatic eviction) is marked DEFERRED so downstream verification does not flag it as a silent gap. `unload_campaign_section` removed from the dropped-tools list (it stays this phase).

## Tasks & Commits

| Task | Name | Commit | Files |
| ---- | ---- | ------ | ----- |
| 1 | Merge inventory + countdown pairs | `1170b7c` | backend/agent/tools.py |
| 2 | Retire set_boss_battle, apply_damage is_boss + auto-clear, factor _check_level_up | `daaf386` | backend/agent/tools.py, backend/agent/definition.py |
| 3 | ROADMAP + REQUIREMENTS TOOLS-05 descope / baseline correction | `eb115fc` | .planning/ROADMAP.md, .planning/REQUIREMENTS.md |

## Verification

- `import agent.tools` / `import agent.definition` import cleanly under `uv run python` (the `.venv` was a stale symlink; `uv run` rebuilt it from the locked CPython 3.12.8 env).
- Registered tool count = **14** (regex over `@gm_agent.tool` / `@gm_agent.tool_plain` decorators): `apply_condition, apply_damage, ask_player_roll, award_xp, create_enemy, load_campaign_section, modify_inventory, narrate, remove_condition, remove_enemy, roll_dice, set_countdown, unload_campaign_section, update_character_state`.
- Merged-away tools absent (`add_to_inventory`, `remove_from_inventory`, `create_countdown`, `update_countdown`, `set_boss_battle`); replacements present.
- `apply_damage` signature has `is_boss`; `_check_level_up` exists and is NOT in the decorated-tool set; `award_xp` source calls `_check_level_up`.
- `is_boss_battle` paths confirmed via `git grep`: write `True` in `apply_damage`, write `False` in `remove_enemy` (empty-enemies), read in the PC-at-0 Blaze-of-Glory branch.
- `load_campaign_section` / `unload_campaign_section` left untouched (TOOLS-05 descoped).
- INV-04/INV-05: this plan's three commits touched only `backend/agent/tools.py`, `backend/agent/definition.py`, `.planning/ROADMAP.md`, `.planning/REQUIREMENTS.md` — no edits to `backend_generalist/`, `frontend/`, `api/schemas.py`, or `GameState`'s class shape / other Pydantic models.
- Task 3 doc-assertion script passes (`docs ok`).

Note: INV-02 (full FastAPI + React turn) and INV-03 (CLI start + turn) are end-of-phase human-verified smoke gates and are not part of this autonomous plan; they are covered by the phase's checkpoint plan.

## TDD Gate Compliance

Tasks 1 and 2 are marked `tdd="true"` in the plan, but the repo has no unit-test infrastructure for the agent tools and the project config has `tdd_mode: false`. The plan's `<verify>` blocks are `python -c` assertion probes rather than a RED/GREEN test suite, so this plan was executed against those automated assertions (all passing) instead of authored test files. No `test(...)` / `feat(...)` RED/GREEN commit pairing was produced because no test files exist to drive it; the behavior is verified by the inline assertion probes documented above.

## Deviations from Plan

None functional — plan executed as written. One environment note: the project `.venv` symlink was stale (pointing at a non-existent interpreter), so verification used `uv run python`, which transparently rebuilt the venv from `uv.lock`. No code or dependency changes were made.

## Self-Check: PASSED

- FOUND: backend/agent/tools.py (modify_inventory, set_countdown, _check_level_up, apply_damage is_boss, set_boss_battle removed)
- FOUND: backend/agent/definition.py (countdown-tick note)
- FOUND: .planning/ROADMAP.md (≤14, TOOLS-05 DEFERRED)
- FOUND: .planning/REQUIREMENTS.md (TOOLS-05 DEFERRED, TOOLS-06 ≤14, traceability Deferred)
- FOUND: commit 1170b7c (Task 1)
- FOUND: commit daaf386 (Task 2)
- FOUND: commit eb115fc (Task 3)
- FOUND: .planning/phases/03-tool-surface-consolidation-v2-0/03-01-SUMMARY.md
