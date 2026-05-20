# Phase 3: tool-surface-consolidation (v2.0) - Context

**Gathered:** 2026-05-20
**Status:** Ready for planning

<domain>
## Phase Boundary

Tier 3 tool-surface reduction in `backend/agent/tools.py` (the live production stack). Merge the inventory pair, merge the countdown pair, retire `set_boss_battle`, factor level-up out of `award_xp` into a non-tool helper — preserving every previously expressible in-fiction capability.

**Scope change from ROADMAP (decided in this discussion):**
- **TOOLS-05 is DESCOPED.** The implicit-LRU rewrite is NOT done this phase. `load_campaign_section` and `unload_campaign_section` stay as-is (manual, 3-section cap). See D-09 and the Deferred Ideas section.
- **TOOLS-06 target is corrected.** The roadmap's "≤ 11 (down from ~15)" was anchored to a wrong baseline — the real registered count is 17. The named consolidations (minus the descoped TOOLS-05) drop 3 tools → land at **14**. New target: **≤ 14**. See D-10.

Unchanged invariants: no change to `GameState`'s shape or `GameStateSnapshot` (Phase 4). No change to SSE event types or payload field names (INV-01, hard contract). No edits to `backend_generalist/` (INV-04) or `frontend/`. Non-`GameState` Pydantic models untouched (INV-05). CLI still starts + accepts a turn (INV-03 smoke).

</domain>

<decisions>
## Implementation Decisions

### TOOLS-01 — Inventory merge
- **D-01:** Replace `add_to_inventory` + `remove_from_inventory` with a single `modify_inventory(action, item)` tool. `action` is `Literal["add", "remove"]`.
- **D-02:** Single item per call — no list argument. Matches today's atomic per-call behavior; keeps the diff minimal.
- **D-03:** Preserve current validation: `remove` raises `ModelRetry` if the item is not present (with the current inventory listed); both actions return the updated inventory list in the result string. `add` requires an initialized PC (current `ModelRetry` if `pc is None`).

### TOOLS-02 — Countdown merge
- **D-04:** Replace `create_countdown` + `update_countdown` with a single `set_countdown(name, value)` tool using **absolute-value upsert** semantics: if `name` doesn't exist, create it at `value`; if it exists, set it to `value`. Both create-new and modify-existing capabilities preserved in one operation.
- **D-05:** `value < 0` raises `ModelRetry` (an explicit absolute target should be valid — mirrors today's `create_countdown` negative-value guard). `value == 0` reports "(TRIGGERED!)" in the result string.
- **D-06:** Behavioral note for the prompt: the agent ticks a countdown by setting `N-1` (it already sees current countdown values in its game-state context), rather than passing `delta=-1`. The slimmer Phase-2 prompt should state this in one line. No more delta/clamp/accumulation ambiguity.

### TOOLS-03 — set_boss_battle retirement
- **D-07:** Keep the `is_boss_battle` boolean field on `GameState` (it must persist across turns — the Blaze-of-Glory branch reads it on a later turn than when the boss fight started). Remove the `set_boss_battle` tool from the surface.
- **D-08:** Set the flag via a new optional `is_boss: bool = False` argument on `apply_damage` — when `True`, set `ctx.deps.is_boss_battle = True`. The PC-at-0-HP "Blaze of Glory / Risk It All" branch (`tools.py:268`) reads the same flag, unchanged. This is one of the two approaches TOOLS-03 explicitly names; the "derive from section/scene" alternative was rejected because campaign sections are prose markdown with no structured boss metadata (building it would be scope creep + fragile).
- **D-08b:** **Auto-clear** `is_boss_battle` when combat ends (e.g. when the last enemy is removed / `in_combat` flips false). Rationale: with the toggle tool gone there is a setter but no un-setter; a stale `True` flag would wrongly fire Blaze-of-Glory in a later *non-boss* fight where the PC hits 0. Implement as a side-effect in the existing combat-end / enemy-removal path — no new tool.

### TOOLS-04 — award_xp level-up factoring
- **D-09a:** Factor level-up detection + reporting (currently `tools.py:481-491`) into a non-tool helper, e.g. `_check_level_up(pc) -> str | None`. `award_xp`'s body shrinks to xp accounting + a call to the helper, appending its message if any. The helper is NOT registered as a `@gm_agent.tool`. (No gray area — pure refactor.)

### TOOLS-05 — DESCOPED this phase
- **D-09:** The implicit-LRU rewrite is **not** done. `load_campaign_section` and `unload_campaign_section` remain on the surface, manual, with the existing 3-section cap and `ModelRetry`-at-capacity behavior. This means TOOLS-05's success criterion (#4, automatic eviction) is intentionally not met. ROADMAP.md and REQUIREMENTS.md must be updated to mark TOOLS-05 deferred so verification does not flag it as a silent gap. See Deferred Ideas.

### TOOLS-06 — Tool-count target correction
- **D-10:** Real registered count is **17** (not the ~15 the roadmap assumed). Confirmed drops this phase: `remove_from_inventory`, `update_countdown`, `set_boss_battle` (level-up factoring drops none; `unload_campaign_section` is kept per D-09). Net **−3 → 14 tools**. Corrected target: **≤ 14**. No merges beyond the named consolidations (matches the user's Phase-2 lowest-blast-radius pattern; the condition-pair / enemy-pair merges considered to hit ≤11 were rejected as out-of-scope extra risk).

### Claude's Discretion
- Exact tool/helper names (`modify_inventory`, `set_countdown`, `_check_level_up`), `Literal` vs enum for the inventory `action`, parameter ordering, docstring wording, and the precise location of the boss-flag auto-clear within the combat-end / `remove_enemy` path. Updated tool docstrings remain the single source of tool-shape documentation (per Phase 2 DEDUP-02).

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Planning artifacts
- `.planning/ROADMAP.md` — Phase 3 goal, the 5 success criteria, out-of-scope, and v2.0 invariants INV-01..05. **NOTE:** TOOLS-05 / criterion #4 and the "≤11" in TOOLS-06 are superseded by D-09 and D-10 here — roadmap needs updating.
- `.planning/REQUIREMENTS.md` — TOOLS-01..06 + INV-01..05 full text. TOOLS-05 to be marked deferred; TOOLS-06 target to be corrected to ≤14.
- `.planning/PROJECT.md` — milestone framing; constraints (wire format is the invariant; tool-surface reductions must preserve every in-fiction capability); "auto eval harness out of scope" note.

### Files this phase edits
- `backend/agent/tools.py` — all tool definitions. Merge targets: `add_to_inventory`/`remove_from_inventory` (TOOLS-01), `create_countdown`/`update_countdown` (TOOLS-02), `set_boss_battle` removal + `apply_damage` arg (TOOLS-03), `award_xp` level-up factoring (TOOLS-04). `load_campaign_section`/`unload_campaign_section` LEFT AS-IS (TOOLS-05 descoped).
- `backend/game/models.py` — `GameState.is_boss_battle` (`:145`) kept; the combat-end / enemy-removal path is where the boss-flag auto-clear (D-08b) lands. Do NOT change `GameState`'s class shape (that's Phase 4); do NOT touch `CharacterState`/`EnemyState`/`Stats` (INV-05). `XP_THRESHOLDS` is read by the level-up helper.
- `backend/agent/definition.py` — system prompt may need a one-line note for the new countdown tick semantics (D-06) and the merged tool names; relies on tool docstrings for shape (Phase-2 DEDUP-02 convention).

### Contract / invariant references (must NOT change)
- `frontend/src/api/client.ts` — SSE event consumer; INV-01 says it needs no edits.
- `frontend/src/types/index.ts` — SSE payload type definitions; INV-01 says it needs no edits.
- `backend/api/turn_engine.py` — emits SSE events; tool-surface changes must not alter event types or `game_state` payload field names (INV-01).
- `backend/api/schemas.py` — `GameStateSnapshot` is Phase 4's target, NOT touched here.

### Call sites to keep working
- `backend/app.py` — FastAPI routes (INV-02 full-turn smoke).
- `backend/cli.py` — session start + turn loop, including `handle_ask_player_roll` deferred handler (INV-03 smoke).

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `apply_damage` (`tools.py:248`) already reads `ctx.deps.is_boss_battle` for the Blaze-of-Glory branch — TOOLS-03 reuses this read path verbatim; only the *write* path changes (param instead of toggle tool).
- `XP_THRESHOLDS` (imported from `game.models`) and the existing level-up block (`tools.py:481-491`) lift cleanly into `_check_level_up`.
- `remove_enemy` (`tools.py:218`) and the combat-end transition are the natural homes for the boss-flag auto-clear (D-08b).

### Established Patterns
- Every tool is a `@gm_agent.tool` (or `@gm_agent.tool_plain` for `roll_dice`) with a docstring documenting its shape — docstrings are the single source of tool documentation post-Phase-2. Merged tools must carry docstrings describing the `action` / upsert semantics.
- `ModelRetry` is the established way to reject invalid tool input (not-present item, negative value, missing PC, target-not-found). Merged tools keep this pattern.
- Tools mutate `ctx.deps` (the `GameState`) in place and return a human-readable result string that the agent sees.

### Integration Points
- The merged/changed tools are invoked only through the agent run loop in `turn_engine.py`; no direct callers elsewhere. SSE payloads are produced by `_snapshot()` and are unaffected by tool *names* (only by `GameState` field values, which are unchanged here).
- `handle_ask_player_roll` (`tools.py:536`) is the only deferred-tool handler and is unrelated to this phase's merges — leave untouched.

</code_context>

<specifics>
## Specific Ideas

- User consistently chose the lowest-blast-radius option satisfying each requirement (named-merge over over-merging, keep manual section load/unload, accept 14 over chasing ≤11 with extra merges, single-item inventory calls). Planner should favor minimal surgical diffs and avoid speculative refactors beyond the four in-scope consolidations (TOOLS-01/02/03/04).
- User actively descopes when a requirement isn't worth the change (TOOLS-05) — prefer flagging requirement/roadmap drift explicitly over silently implementing or silently skipping.

</specifics>

<deferred>
## Deferred Ideas

- **TOOLS-05 implicit-LRU section caching** — descoped from this phase by user decision (D-09). `load`/`unload` stay manual with the 3-cap. Revisit in a future hardening milestone if context-budget management becomes a pain point. ROADMAP.md + REQUIREMENTS.md to be updated to mark TOOLS-05 deferred.
- **Merging the condition pair (`apply_condition`/`remove_condition`) and enemy pair (`create_enemy`/`remove_enemy`)** — considered as a path to hit the original ≤11 target; rejected as out-of-scope extra risk for this phase (D-10). Candidate consolidations if a future phase wants a smaller surface.

</deferred>

---

*Phase: 3-tool-surface-consolidation-v2-0*
*Context gathered: 2026-05-20*
