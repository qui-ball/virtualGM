# Phase 3: tool-surface-consolidation (v2.0) - Pattern Map

**Mapped:** 2026-05-20
**Files analyzed:** 3 (all existing, modified in place — no new files)
**Analogs found:** 6 / 6 edit-targets (every pattern already lives in-repo)

This is a surgical refactor of an existing `pydantic-ai` tool surface. There are NO new files and NO external analogs to copy — every pattern the executor needs is already present in `backend/agent/tools.py`. The job is to merge/retire/factor existing tools while mirroring the conventions already in that file. All line numbers below are from the current `tools.py` / `models.py` / `definition.py`.

---

## File Classification

| Edit-target | Role | Data Flow | Closest In-Repo Analog | Match Quality |
|-------------|------|-----------|------------------------|---------------|
| `modify_inventory(action, item)` (replaces `add_to_inventory` + `remove_from_inventory`) | tool | transform (in-place mutate + result string) | `add_to_inventory` (`tools.py:496-508`) + `remove_from_inventory` (`tools.py:511-528`) | exact (merge of two existing) |
| `set_countdown(name, value)` (replaces `create_countdown` + `update_countdown`) | tool | transform (upsert) | `create_countdown` (`tools.py:411-432`) + `update_countdown` (`tools.py:435-456`) | exact (merge of two existing) |
| `apply_damage(..., is_boss=False)` + remove `set_boss_battle` | tool | transform (in-place mutate) | `apply_damage` (`tools.py:247-295`); write path replaces `set_boss_battle` (`tools.py:234-244`) | exact (existing read path reused; write path moves into existing tool) |
| `_check_level_up(pc) -> str \| None` (non-tool helper) | utility | transform (pure, returns str-or-None) | level-up block inside `award_xp` (`tools.py:481-491`) | exact (lift in place) |
| `GameState.is_boss_battle` auto-clear on combat-end (D-08b) | model side-effect | event-driven (combat-end transition) | `remove_enemy` (`tools.py:217-231`) | role-match (no existing auto-clear pattern; see "No Analog" note) |
| countdown-tick prompt note (D-06) | config (system prompt) | n/a | `definition.py:74-128` instructions block | role-match (prompt is terse, relies on docstrings per DEDUP-02) |

---

## Pattern Assignments

### 1. `modify_inventory(action, item)` — replaces `add_to_inventory` + `remove_from_inventory`

**Role:** tool | **Data flow:** transform (mutate `ctx.deps.pc.inventory` in place, return updated list)

**Analogs (the two tools being merged):** `tools.py:496-508` (add) and `tools.py:511-528` (remove).

The executor merges these two by branching on `action: Literal["add", "remove"]`. Both branches MUST keep the `pc is None` guard and return the updated inventory in the result string (D-03).

**`add` branch — copy verbatim** (`tools.py:496-508`):
```python
@gm_agent.tool
def add_to_inventory(ctx: RunContext[GameState], item: str) -> str:
    """Add an item to the player character's inventory.

    Args:
        item: Name of the item to add
    """
    if ctx.deps.pc is None:
        raise ModelRetry("No player character initialized.")

    ctx.deps.pc.inventory.append(item)
    logger.info(f"🎒 Added '{item}' to inventory")
    return f"Added '{item}' to inventory. Inventory: {ctx.deps.pc.inventory}"
```

**`remove` branch — copy the not-present `ModelRetry` validation verbatim** (`tools.py:511-528`):
```python
@gm_agent.tool
def remove_from_inventory(ctx: RunContext[GameState], item: str) -> str:
    """Remove an item from the player character's inventory.

    Args:
        item: Name of the item to remove (must match exactly)
    """
    if ctx.deps.pc is None:
        raise ModelRetry("No player character initialized.")

    if item not in ctx.deps.pc.inventory:
        raise ModelRetry(
            f"Item '{item}' not in inventory. Current inventory: {ctx.deps.pc.inventory}"
        )

    ctx.deps.pc.inventory.remove(item)
    logger.info(f"🎒 Removed '{item}' from inventory")
    return f"Removed '{item}' from inventory. Inventory: {ctx.deps.pc.inventory}"
```

**Merge shape (executor target — `Literal` enum for `action` per Claude's Discretion):**
- Signature: `def modify_inventory(ctx: RunContext[GameState], action: Literal["add", "remove"], item: str) -> str`
- `Literal` must be imported. Note `tools.py` does NOT currently import `Literal` — it's only in `game/models.py:4`. The executor must add `from typing import Literal` to `tools.py`'s imports (the existing import block is `tools.py:1-20`).
- Single `pc is None` guard at top (shared by both actions).
- Docstring documents the `action` literal (single source of tool-shape doc, DEDUP-02).

---

### 2. `set_countdown(name, value)` — replaces `create_countdown` + `update_countdown`

**Role:** tool | **Data flow:** transform (absolute-value upsert into `ctx.deps.countdowns`)

**Analogs (the two tools being merged):** `tools.py:411-432` (create) and `tools.py:435-456` (update).

D-04/D-05: upsert by absolute value. `value < 0` → `ModelRetry` (mirror create's negative guard). `value == 0` → "(TRIGGERED!)" in result string.

**`create_countdown` — source of the negative-value guard and the value==0 messaging** (`tools.py:411-432`):
```python
@gm_agent.tool
def create_countdown(ctx: RunContext[GameState], name: str, initial_value: int) -> str:
    """Create a new countdown tracker. Triggers when it reaches 0.

    Args:
        name: Name/identifier for the countdown
        initial_value: Starting value (must be >= 0)
    """
    if name in ctx.deps.countdowns:
        raise ModelRetry(
            f"Countdown '{name}' already exists. Use update_countdown to modify it."
        )

    if initial_value < 0:
        raise ModelRetry(f"Countdown initial value must be >= 0, got {initial_value}")

    ctx.deps.countdowns[name] = initial_value
    logger.info(f"⏱️ Created countdown '{name}' with value {initial_value}")

    if initial_value == 0:
        return f"Created countdown '{name}' at 0 (TRIGGERS IMMEDIATELY!)"
    return f"Created countdown '{name}' with value {initial_value}"
```

**`update_countdown` — source of the existing/old→new logging + TRIGGERED string** (`tools.py:435-456`):
```python
@gm_agent.tool
def update_countdown(ctx: RunContext[GameState], name: str, delta: int) -> str:
    """Update an existing countdown by applying a delta.

    Args:
        name: Name of the countdown
        delta: Change to apply (e.g., -1 to tick down, +1 to tick up)
    """
    if name not in ctx.deps.countdowns:
        raise ModelRetry(
            f"Countdown '{name}' not found. Available: {list(ctx.deps.countdowns.keys())}"
        )

    old_value = ctx.deps.countdowns[name]
    new_value = max(0, old_value + delta)
    ctx.deps.countdowns[name] = new_value

    logger.info(f"⏱️ Countdown '{name}': {old_value} → {new_value}")

    if new_value == 0 and old_value > 0:
        return f"Countdown '{name}': {old_value} → 0 (TRIGGERED!)"
    return f"Countdown '{name}': {old_value} → {new_value}"
```

**Merge shape (executor target):**
- Signature: `def set_countdown(ctx: RunContext[GameState], name: str, value: int) -> str`
- Drop the "already exists" `ModelRetry` from create AND the "not found" `ModelRetry` from update — upsert means neither is an error.
- Keep ONLY the `value < 0` → `ModelRetry` guard (D-05).
- Assign absolutely: `ctx.deps.countdowns[name] = value` (no `delta`, no `max(0, ...)` accumulation).
- Result string: report `value == 0` as "(TRIGGERED!)" (D-05). The create-vs-set distinction (was the key present before?) can be reflected in the message if useful, but the agent ticks by setting `N-1` (D-06) — see prompt note in §6.

---

### 3. `apply_damage(..., is_boss=False)` + retire `set_boss_battle`

**Role:** tool | **Data flow:** transform | **D-07/D-08:** keep `GameState.is_boss_battle` field; delete the toggle tool; add `is_boss: bool = False` arg to `apply_damage` that sets the flag `True` when passed.

**Tool to DELETE entirely** (`tools.py:234-244`):
```python
@gm_agent.tool
def set_boss_battle(ctx: RunContext[GameState], active: bool) -> str:
    """Toggle boss battle mode for the current encounter.

    Args:
        active: True to start a boss battle, False to end it
    """
    ctx.deps.is_boss_battle = active
    status = "STARTED" if active else "ENDED"
    logger.info(f"👑 Boss battle {status}")
    return f"Boss battle {status}"
```

**`apply_damage` — the existing read path is reused UNCHANGED; only add the write path** (`tools.py:247-295`):
```python
@gm_agent.tool
def apply_damage(ctx: RunContext[GameState], target: str, amount: int) -> str:
    """Apply damage to the player character or an enemy.

    Args:
        target: "pc" for player character, or enemy_id for an enemy
        amount: Damage amount to apply
    """
    if amount < 0:
        raise ModelRetry("Damage amount must be non-negative. Use healing instead.")

    if target == "pc":
        if ctx.deps.pc is None:
            raise ModelRetry("No player character initialized.")
        old_hp = ctx.deps.pc.hp
        ctx.deps.pc.hp = max(0, ctx.deps.pc.hp - amount)
        new_hp = ctx.deps.pc.hp

        result = f"PC took {amount} damage: {old_hp} → {new_hp}/{ctx.deps.pc.hp_max} HP"

        if new_hp == 0:
            if ctx.deps.is_boss_battle:                                      # <-- READ PATH: keep verbatim
                result += " (DEFEATED in boss battle - player must choose: Blaze of Glory or Risk It All)"
            else:
                result += " (DEFEATED - recovers with full HP/mana, but loot is stolen)"

        logger.info(f"💔 {result}")
        return result

    elif target in ctx.deps.enemies:
        # ... enemy branch unchanged ...
```

**Executor target for the write path:**
- Add `is_boss: bool = False` to the signature (parameter ordering at Claude's Discretion — natural place is after `amount`).
- Near the top of the body (before or after the `amount < 0` guard), set the flag when requested:
  ```python
  if is_boss:
      ctx.deps.is_boss_battle = True
  ```
- Document `is_boss` in the docstring `Args:` block (DEDUP-02).
- The `if new_hp == 0: if ctx.deps.is_boss_battle:` branch at `tools.py:267-271` stays exactly as-is — this is the Blaze-of-Glory read the field exists for (CONTEXT D-08, code-context note `tools.py:268`).

---

### 4. `_check_level_up(pc) -> str | None` — factor out of `award_xp`

**Role:** non-tool utility | **Data flow:** transform (pure-ish: mutates `pc.level`, returns message-or-None)

**D-09a:** lift the level-up block out of `award_xp` into a module-level helper that is NOT decorated with `@gm_agent.tool`. `award_xp` shrinks to xp accounting + a call to the helper, appending its return if not None.

**Full current `award_xp` — block to lift is lines 481-491** (`tools.py:459-493`):
```python
@gm_agent.tool
def award_xp(ctx: RunContext[GameState], amount: int, reason: str) -> str:
    """Award experience points to the player character.

    Args:
        amount: XP to award (must be positive)
        reason: Why the XP is being awarded (e.g., "defeated skeleton", "completed quest")
    """
    if ctx.deps.pc is None:
        raise ModelRetry("No player character initialized.")
    if amount <= 0:
        raise ModelRetry("XP amount must be positive.")
    if ctx.deps.in_combat:
        raise ModelRetry("Cannot award XP during combat. Award XP after combat ends.")

    pc = ctx.deps.pc
    old_xp = pc.xp
    pc.xp += amount

    result = f"Awarded {amount} XP for '{reason}': {old_xp} → {pc.xp} XP"
    logger.info(f"⭐ {result}")

    # Check for level-up                                          # <-- LIFT 481-491 START
    if pc.level < 10:
        next_threshold = XP_THRESHOLDS.get(pc.level + 1)
        if next_threshold and pc.xp >= next_threshold:
            old_level = pc.level
            pc.level += 1
            result += (
                f"\n🎉 LEVEL UP! {old_level} → {pc.level}! "
                f"The player must choose one: HP increase, +1 Evasion, or a class ability."
            )
            logger.info(f"🎉 Level up! {old_level} → {pc.level}")    # <-- LIFT 481-491 END

    return result
```

**Executor target:**
- New module-level function (place near the other tools, e.g. just above `award_xp`), NO decorator:
  ```python
  def _check_level_up(pc) -> str | None:
      """Detect and apply a single level-up. Returns a player-facing message, or None."""
      if pc.level < 10:
          next_threshold = XP_THRESHOLDS.get(pc.level + 1)
          if next_threshold and pc.xp >= next_threshold:
              old_level = pc.level
              pc.level += 1
              logger.info(f"🎉 Level up! {old_level} → {pc.level}")
              return (
                  f"\n🎉 LEVEL UP! {old_level} → {pc.level}! "
                  f"The player must choose one: HP increase, +1 Evasion, or a class ability."
              )
      return None
  ```
- `award_xp` body after the xp accounting becomes:
  ```python
  level_up_msg = _check_level_up(pc)
  if level_up_msg:
      result += level_up_msg
  return result
  ```
- Preserve all three existing `ModelRetry` guards (`pc is None`, `amount <= 0`, `in_combat`) in `award_xp` unchanged. `XP_THRESHOLDS` is already imported (`tools.py:11`) so the helper can use it directly.
- Type hint: `pc` is a `CharacterState`. It is NOT currently imported in `tools.py` (the import block `tools.py:9-16` brings in `DICE_SIDES, XP_THRESHOLDS, ConditionName, DiceType, EnemyState, GameState` — note `CharacterState` is absent). Either add `CharacterState` to that import and annotate `pc: CharacterState`, or use a loose annotation. Adding the import is the cleaner, lower-surprise choice.

---

### 5. `is_boss_battle` auto-clear on combat-end (D-08b)

**Role:** model side-effect | **Data flow:** event-driven (combat-end transition)

**D-08b:** with the toggle tool gone there is a setter (`apply_damage(is_boss=True)`) but no un-setter. A stale `True` would wrongly fire Blaze-of-Glory in a later non-boss fight. Auto-clear when combat ends — implemented as a side-effect in the existing enemy-removal path, no new tool.

**Field is KEPT** (`game/models.py:145`):
```python
self.is_boss_battle: bool = False
```

**Closest analog / natural home — `remove_enemy`** (`tools.py:217-231`):
```python
@gm_agent.tool
def remove_enemy(ctx: RunContext[GameState], enemy_id: str) -> str:
    """Remove an enemy from the encounter.

    Args:
        enemy_id: The enemy identifier to remove
    """
    if enemy_id not in ctx.deps.enemies:
        raise ModelRetry(
            f"Enemy '{enemy_id}' not found. Available: {list(ctx.deps.enemies.keys())}"
        )

    del ctx.deps.enemies[enemy_id]
    logger.info(f"Removed enemy '{enemy_id}'")
    return f"Removed '{enemy_id}'"
```

**Executor target — add the auto-clear as a side-effect after the `del`, gated on "last enemy gone":**
```python
del ctx.deps.enemies[enemy_id]
logger.info(f"Removed enemy '{enemy_id}'")

# Combat-end transition: when the last enemy is removed, clear the boss flag (D-08b)
if not ctx.deps.enemies:
    ctx.deps.is_boss_battle = False

return f"Removed '{enemy_id}'"
```
The exact placement / condition is at Claude's Discretion (CONTEXT D-08b, "Claude's Discretion"). The "enemies dict is now empty" signal is the only structured combat-end indicator available in this path (see No Analog note below).

---

### 6. Countdown-tick prompt note (D-06) — `definition.py`

**Role:** config (system prompt) | **D-06:** the agent ticks a countdown by calling `set_countdown(name, N-1)` (it already sees current values in `<current_game_state>`), not by passing a delta. Add one terse line; rely on the tool docstring for shape (Phase-2 DEDUP-02).

**Analog — the instructions block** (`definition.py:74-128`). It is intentionally terse and does NOT enumerate per-tool args; tool docstrings carry shape. The note should match that brevity. A natural home is near the "Combat Rules Summary" / pacing area, or a one-liner under a state-tracking heading. Example one-liner the executor can drop in:
> "To tick a countdown, call set_countdown with the new absolute value (e.g. set it to one less than its current value shown in game state)."

**Dynamic state injection already shows countdown values** (`definition.py:190-193`) — confirms the agent has the current value available to compute `N-1`:
```python
if ctx.deps.countdowns:
    state_info.append("Countdowns:")
    for name, value in ctx.deps.countdowns.items():
        state_info.append(f"  {name}: {value}")
```
No change needed to `current_game_state`. The prompt note is optional polish; if added, keep it to one line.

---

## Shared Patterns

These conventions are already uniform across `tools.py` and every merged/edited tool MUST preserve them.

### Pattern A — Tool registration + docstring-as-doc
**Source:** every tool, e.g. `narrate` (`tools.py:30-44`), `create_enemy` (`tools.py:178-214`).
- Decorator `@gm_agent.tool` with `ctx: RunContext[GameState]` as first param (or `@gm_agent.tool_plain` only for `roll_dice`, `tools.py:98` — irrelevant here).
- Docstring opens with a one-line description, then an `Args:` block. Post-Phase-2 (DEDUP-02) the docstring is the SINGLE source of tool-shape documentation. Merged tools (`modify_inventory`, `set_countdown`) and the new `apply_damage` `is_boss` arg MUST document the new shape in their docstrings.
```python
@gm_agent.tool
def create_enemy(
    ctx: RunContext[GameState],
    enemy_id: str,
    hp_max: int,
    ...
) -> str:
    """Create an enemy in the encounter.

    Args:
        enemy_id: Unique identifier for the enemy (e.g., "Goblin 1")
        ...
    """
```

### Pattern B — `ModelRetry` for invalid input
**Source:** ubiquitous — `tools.py:59`, `:197`, `:225`, `:256`, `:260`, `:421`, `:424`, `:443`, `:468`, `:522`.
- Reject invalid tool input by raising `ModelRetry(<actionable message>)`. Messages list current valid state so the model can self-correct (e.g. "Current inventory: [...]", "Available: [...]").
- Keep guards: `modify_inventory` keeps `pc is None` (both actions) + not-present on `remove`; `set_countdown` keeps `value < 0`; `apply_damage` keeps `amount < 0` + `pc is None` + target-not-found; `award_xp` keeps all three existing guards.
```python
if item not in ctx.deps.pc.inventory:
    raise ModelRetry(
        f"Item '{item}' not in inventory. Current inventory: {ctx.deps.pc.inventory}"
    )
```

### Pattern C — In-place mutate `ctx.deps` + emoji log + return result string
**Source:** every state tool, e.g. `apply_damage` (`tools.py:262-273`), `add_to_inventory` (`tools.py:506-508`).
- Tools mutate the shared `GameState` (`ctx.deps`) IN PLACE — no return-new-state, no copies.
- `logger.info(f"<emoji> ...")` for human-trace (🎒 inventory, ⏱️ countdown, 💔/⚔️ damage, ⭐ xp, 🎉 level-up, 👑 boss). Reuse the existing emoji per concern.
- Return a concise human-readable string the agent reads back; for collection mutations, echo the resulting collection (inventory list).
```python
ctx.deps.pc.inventory.append(item)
logger.info(f"🎒 Added '{item}' to inventory")
return f"Added '{item}' to inventory. Inventory: {ctx.deps.pc.inventory}"
```

---

## No Analog Found

| Edit-target | Role | Data Flow | Reason |
|-------------|------|-----------|--------|
| `is_boss_battle` auto-clear (D-08b) | model side-effect | event-driven | There is **no existing "combat-end" hook** in the live stack. `in_combat` is never set or cleared by any tool in `tools.py` (it is only *read* by `award_xp` at `tools.py:471`); no tool toggles it (confirmed: `grep` for `in_combat` outside tools.py finds only the field def `models.py:144`, recording/snapshot reads, and the schema). So there is no `in_combat`-flip event to hang the clear on. The only structured combat-end signal available is "the `enemies` dict became empty after `remove_enemy`'s `del`". The planner should implement the auto-clear there (`if not ctx.deps.enemies: ctx.deps.is_boss_battle = False`), as shown in §5. If the planner wants a more robust trigger, that would require introducing combat-state management that does not exist today — out of scope for this surgical phase. |

---

## Metadata

**Analog search scope:** `backend/agent/tools.py`, `backend/game/models.py`, `backend/agent/definition.py`; cross-checked `in_combat`/`is_boss_battle`/`enemies` usage across `backend/**/*.py` (excluding the dead `backend/.main.py` and tests).
**Files scanned:** 3 primary + repo-wide grep for combat-state symbols.
**Key import gaps the executor must close in `tools.py`:** `from typing import Literal` (for `modify_inventory.action`); add `CharacterState` to the `game.models` import if annotating `_check_level_up(pc: CharacterState)`.
**Pattern extraction date:** 2026-05-20
