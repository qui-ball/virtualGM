# Phase 2: backend-dedup (v2.0) - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-05-19
**Phase:** 2-backend-dedup-v2-0
**Areas discussed:** SSE core factoring, Test-file disposition, Prompt trim depth, Refactor verification

---

## SSE core factoring (DEDUP-01)

| Option | Description | Selected |
|--------|-------------|----------|
| Private helper + thin wrappers | `_stream_core(session, run_kwargs)` holds shared body; `stream_turn` / `stream_deferred_response` become ≤5-line wrappers. | ✓ |
| Single unified function | One `stream_turn(session, *, player_message=None, deferred_result=None)` replaces both. | |
| Wrappers disappear | Only the shared core is exported; `app.py` / `cli.py` call it directly. | |

**User's choice:** Private helper + thin wrappers (asked for a recommendation first; confirmed after).
**Notes:** Matches ROADMAP DEDUP-01 success criterion verbatim (≤5-line wrappers explicitly allowed). Two named entry points keep `app.py` call sites self-documenting. Lowest blast radius for INV-01..03. `_handle_result` / `_snapshot` stay as separate module-level helpers; deferred-path precondition + `DeferredToolResults` assembly stay in the wrapper.

---

## Test-file disposition (DEDUP-04)

| Option | Description | Selected |
|--------|-------------|----------|
| Delete both | Neither tests the GM agent; remove outright; clears pytest discovery noise. | ✓ |
| Move to scripts/experiments/ | Relocate + rename for clarity, keep as reference. | |
| Doc-tag and keep in place | Add docstrings stating distinct purposes. | |

**User's choice:** Delete both.
**Notes:** `agent_test.py` = local MLX gemma chat REPL; `test_agent.py` = verbatim pydantic-ai weather sample. Neither references the production GM agent. `test_tps.py` (TPS benchmark) is intentional and out of DEDUP-04 scope.

---

## Prompt trim depth (DEDUP-02 / DEDUP-03)

| Option | Description | Selected |
|--------|-------------|----------|
| Minimal — drop Tools: block only | Remove per-tool enumeration; keep everything else. | |
| Targeted — drop Tools: + de-name narrate() | Also rephrase Output Format generically. | |
| Aggressive — also move mechanics into ruleset | Lift Skill Checks + Combat Rules into core-ruleset.md. | ✓ (initial) |

**User's choice:** Initially "Aggressive"; on follow-up narrowed to keep mechanics blocks in the prompt.

**Follow-up — Where do the prompt's mechanics blocks go?**

| Option | Description | Selected |
|--------|-------------|----------|
| Append DC ladder to ruleset §5; delete Combat Rules Summary | Single source of truth in ruleset. | |
| Keep DC ladder in prompt; delete Combat Rules Summary | DC ladder as GM coaching. | |
| Keep both blocks in the prompt | Skill Checks + Combat Rules Summary stay as LLM quick-reference. | ✓ |

**User's choice:** Keep both blocks in the prompt.
**Notes:** Net plan — delete the bottom `Tools:` enumeration, de-name `narrate()` in Output Format, keep both mechanics blocks. DC ladder ("easy 8 / moderate 12 / hard 15") is GM adjudication coaching, not ruleset content (`core-ruleset.md` §5 defines no DCs). DEDUP-03: embed `core-ruleset.md` once at module load into `instructions=`, remove `add_ruleset` decorator; `add_campaign` + `current_game_state` stay dynamic.

---

## Refactor verification (INV-01 / INV-02 / INV-03)

| Option | Description | Selected |
|--------|-------------|----------|
| Manual UI smoke only | Run app + UI, play a turn incl. deferred dice roll, eyeball SSE sequence. | ✓ |
| Pre-capture SSE fixture + diff harness + UI smoke | Scripted-turn fixture, replay + byte-diff. | |
| Lean on recording.py + UI smoke | Compare recorded pydantic-ai message exchanges. | |

**User's choice:** Manual UI smoke only.
**Notes:** Consistent with PROJECT.md/REQUIREMENTS — auto eval harness for refactor parity is explicitly out of milestone scope.

**Follow-up — When does the smoke gate run?**

| Option | Description | Selected |
|--------|-------------|----------|
| Once at phase end | Single golden-path smoke after all changes land. | ✓ |
| After each plan/commit | Smoke after each meaningful commit. | |

**User's choice:** Once at phase end.
**Notes:** INV-03 (`cli.py` starts) may be an automated quick check per commit regardless.

---

## Claude's Discretion

- Exact wording of the de-named `## Output Format` block.
- `_stream_core` parameter typing (e.g. `runner_kwargs: dict[str, Any]`) and helper placement/ordering within `turn_engine.py`.
- Module-level constant name for the embedded ruleset.

## Deferred Ideas

- Pre-captured SSE-fixture + replay/diff harness for refactor parity — declined this milestone (out of scope per PROJECT.md).
- Moving the Skill-Checks DC ladder / combat mechanics into `core-ruleset.md` — declined (DC ladder is GM coaching, not ruleset content).
- Making `test_tps.py`'s test-like name / pytest discovery explicit — out of DEDUP-04 scope; left as-is.
