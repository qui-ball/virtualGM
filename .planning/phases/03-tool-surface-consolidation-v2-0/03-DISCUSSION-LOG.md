# Phase 3: tool-surface-consolidation (v2.0) - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-05-20
**Phase:** 3-tool-surface-consolidation-v2-0
**Areas discussed:** Boss-battle retirement (TOOLS-03), Countdown merge semantics (TOOLS-02), LRU section cache (TOOLS-05), Tool-count target & inventory shape (TOOLS-01/06)

---

## Boss-battle retirement (TOOLS-03)

| Option | Description | Selected |
|--------|-------------|----------|
| Keep GameState flag, set via apply_damage | Keep persistent `is_boss_battle`; add optional `is_boss` arg to `apply_damage`; Blaze-of-Glory branch reads the same flag | ✓ |
| Derive from loaded section/scene | Drop the flag; derive boss status from campaign-section metadata at damage time | |
| Keep flag, set via create_enemy | Add `is_boss` to `create_enemy` instead | |

**User's choice:** Keep GameState flag, set via apply_damage (per Claude recommendation).
**Notes:** "Derive from section" rejected — campaign sections are prose markdown with no structured boss metadata; building it is scope creep + fragile. create_enemy rejected — boss status is an encounter property, not a per-enemy one, and isn't one of the two approaches TOOLS-03 names. Added requirement (D-08b): auto-clear the flag when combat ends, since removing the toggle tool leaves a setter with no un-setter (stale `True` would mis-fire Blaze-of-Glory in a later normal fight).

---

## Countdown merge semantics (TOOLS-02)

| Option | Description | Selected |
|--------|-------------|----------|
| Absolute-value upsert | Single `set_countdown(name, value)`; create if missing, set if exists; agent sets `N-1` to tick | ✓ |
| Delta tick semantics | Preserve create-or-adjust by `+/-` delta | |

**User's choice:** Absolute-value upsert (per Claude recommendation).
**Notes:** Absolute removes create-vs-update branching and clamp/accumulation ambiguity into one unambiguous op. Agent already sees current countdown values in context, so setting the new absolute value is straightforward. `value<0` → ModelRetry; `value==0` → TRIGGERED.

---

## LRU section cache (TOOLS-05)

| Option | Description | Selected |
|--------|-------------|----------|
| cap=3 + load-driven LRU + eviction reported | Replace manual load/unload with implicit LRU; auto-evict least-recently-loaded | |
| Descope — keep load/unload manual | Keep both tools as-is with the 3-section cap; no LRU this phase | ✓ |

**User's choice:** Descope — "I'd like to skip this one and keep the load/unload functionalities."
**Notes:** TOOLS-05 success criterion (#4, automatic eviction) intentionally not met this phase. ROADMAP.md / REQUIREMENTS.md to be updated to mark TOOLS-05 deferred. Knock-on: one fewer tool dropped (keep `unload_campaign_section`), feeding the tool-count decision below.

---

## Tool-count target & inventory shape (TOOLS-01/06)

| Option | Description | Selected |
|--------|-------------|----------|
| Accept 14, fix the target | Real count is 17; named consolidations (minus TOOLS-05) drop 3 → 14; rewrite TOOLS-06 to ≤14; no extra merges | ✓ |
| Hit ≤11 with more merges | Merge condition pair + enemy pair + one more to honor ≤11 | |

**User's choice:** Accept 14, fix the target.
**Notes:** The roadmap's ≤11 was anchored to a wrong ~15 baseline (real = 17). No merges beyond the four named consolidations. Inventory shape (sub-question, confirmed separately): single `modify_inventory(action: "add"|"remove", item)`, single item per call, preserve current `ModelRetry` validation.

---

## Claude's Discretion

- Exact tool/helper names (`modify_inventory`, `set_countdown`, `_check_level_up`), `Literal` vs enum for the inventory `action`, parameter ordering, docstring wording, and the precise location of the boss-flag auto-clear within the combat-end / `remove_enemy` path.

## Deferred Ideas

- TOOLS-05 implicit-LRU section caching — descoped; revisit in a future hardening milestone.
- Merging the condition pair (`apply_condition`/`remove_condition`) and enemy pair (`create_enemy`/`remove_enemy`) — considered to hit the original ≤11; rejected as out-of-scope risk; candidate for a future smaller-surface phase.
