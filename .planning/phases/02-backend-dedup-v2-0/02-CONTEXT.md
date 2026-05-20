# Phase 2: backend-dedup (v2.0) - Context

**Gathered:** 2026-05-19
**Status:** Ready for planning

<domain>
## Phase Boundary

Tier 2 internal de-duplication in `backend/` (the live production stack):

- **DEDUP-01** — One shared SSE turn-stream core in `api/turn_engine.py`; `stream_turn` and `stream_deferred_response` become thin wrappers over it.
- **DEDUP-02** — System prompt in `agent/definition.py` no longer enumerates per-tool signatures/arguments.
- **DEDUP-03** — Static ruleset (`prompts/rulesets/core-ruleset.md`) embedded into `instructions=` at module load; the `@gm_agent.instructions add_ruleset` dynamic hook removed.
- **DEDUP-04** — The two `*_test_agent*.py` scratch files resolved.

No change to the agent's registered tool surface (Phase 3). No change to `GameState`'s shape or `GameStateSnapshot` (Phase 4). No change to SSE event types or payload field names (INV-01, hard contract). No edits to `backend_generalist/` or `frontend/`.

</domain>

<decisions>
## Implementation Decisions

### DEDUP-01 — Shared SSE core factoring
- **D-01:** Factor the shared body into a private helper `_stream_core(session, runner_kwargs)`. It owns: queue creation, `gs.narrations.clear()`, `gs._event_queue = queue`, the `run()` closure (with the `on_thinking` callback + `await run_agent_iter(deps=gs, on_thinking=on_thinking, **runner_kwargs)` + `_handle_result(...)`), the `finally` cleanup + `None` sentinel, and the `while queue.get()` drain loop.
- **D-02:** Keep `stream_turn` and `stream_deferred_response` as named entry points. Each becomes ≤5 lines: build its `runner_kwargs` (`{"user_prompt": player_message}` vs `{"message_history": pending.messages_snapshot, "deferred_tool_results": deferred_results}`) and `yield from`/delegate to `_stream_core`. Rationale: ROADMAP DEDUP-01 success criterion explicitly allows ≤5-line wrappers; two named entry points keep the `app.py` call sites self-documenting; lowest blast radius for INV-01..03.
- **D-03:** `_handle_result` and `_snapshot` stay as separate module-level helpers — already cleanly factored, no need to inline or move.
- **D-04:** `stream_deferred_response`'s precondition (`if session.pending_deferred is None: raise ValueError(...)`) and its `DeferredToolResults` assembly stay in the wrapper, before delegating to `_stream_core` — they are deferred-path-specific, not shared.

### DEDUP-02 — System prompt trim
- **D-05:** Delete the bottom `Tools:` enumeration block (`definition.py:115-132`) — the per-tool signatures/argument lists. Tool-shape documentation lives only in `@gm_agent.tool` docstrings.
- **D-06:** Rewrite the `## Output Format` section so it references the narration tool **generically** (e.g. "route all player-visible text through the player-narration tool") rather than naming `narrate()` literally. The behavioral rule (player-visible text goes through narration; final return string is private notes; one beat per turn) is preserved.
- **D-07:** **Keep** `## Skill Checks` (including the "easy 8 / moderate 12 / hard 15" DC ladder) and `## Combat Rules Summary` verbatim in the prompt. Rationale: the DC ladder is GM-side adjudication coaching, NOT ruleset content — `core-ruleset.md` §5 deliberately defines no DCs. Combat Rules Summary is a quick-reference reminder for the LLM. These are not "tool signatures" and are out of DEDUP-02's target.
- **D-08:** Keep `## Core Responsibilities`, `## GM Style`, `## Pacing` unchanged (behavior/pacing/style rules).

### DEDUP-03 — Ruleset embedding
- **D-09:** Read `prompts/rulesets/core-ruleset.md` once at module load (module-level constant), wrap it in `<ruleset>...</ruleset>`, and concatenate it into the static `instructions=` string passed to `Agent(...)`. Remove the `@gm_agent.instructions add_ruleset` decorator entirely.
- **D-10:** `add_campaign` and `current_game_state` instruction hooks **stay dynamic** (`@gm_agent.instructions`) — they depend on per-run `ctx.deps` state.

### DEDUP-04 — Test-file disposition
- **D-11:** **Delete** both `backend/agent_test.py` (a local-MLX-gemma chat REPL) and `backend/test_agent.py` (the verbatim pydantic-ai weather-agent sample). Neither references the GM agent, its tools, or any production module — they are leftover scratch. Deleting also removes the misleading `test_agent.py` from pytest's discovery radius.
- **D-12:** `backend/test_tps.py` is **out of scope** — it is an intentional tokens-per-second throughput benchmark, not part of DEDUP-04 (which names only the two `*_test_agent*.py` files).

### Verification (INV-01 / INV-02 / INV-03)
- **D-13:** Verify SSE byte-compatibility and the end-to-end deferred-dice-roll round-trip via a **manual golden-path UI smoke** (run FastAPI app + Vite dev server, play one turn including a deferred dice roll through the React UI). No automated SSE-fixture/diff harness — consistent with PROJECT.md/REQUIREMENTS, which place an auto eval harness for refactor parity explicitly out of milestone scope.
- **D-14:** The UI smoke gate runs **once at phase end** (after all Phase 2 changes land), not per-commit. INV-03 (`backend/cli.py` still starts a session and accepts a turn) MAY be an automated quick check per commit.

### Claude's Discretion
- Exact wording of the de-named `## Output Format` block (D-06), the `_stream_core` parameter typing (e.g. `runner_kwargs: dict[str, Any]`), helper placement/ordering within `turn_engine.py`, and the module-level constant name for the embedded ruleset.

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Planning artifacts
- `.planning/ROADMAP.md` — Phase 2 goal, success criteria (5), out-of-scope, and the v2.0 invariants INV-01..05.
- `.planning/REQUIREMENTS.md` — DEDUP-01..04 + INV-01..05 full text and traceability.
- `.planning/PROJECT.md` — milestone framing, constraints (wire format is the invariant), and the "auto eval harness out of scope" note.

### Files this phase edits
- `backend/api/turn_engine.py` — `stream_turn`, `stream_deferred_response`, `_handle_result`, `_snapshot` — DEDUP-01 target.
- `backend/agent/definition.py` — `instructions=` string + `@gm_agent.instructions add_ruleset` / `add_campaign` / `current_game_state` — DEDUP-02 + DEDUP-03 target.
- `backend/prompts/rulesets/core-ruleset.md` — the static ruleset embedded at module load (read-only this phase; §5 deliberately defines no skill-check DCs).
- `backend/agent_test.py`, `backend/test_agent.py` — DEDUP-04 deletions.

### Contract / invariant references (must NOT change)
- `frontend/src/api/client.ts` — SSE event consumer; INV-01 says it needs no edits.
- `frontend/src/types/index.ts` — SSE payload type definitions; INV-01 says it needs no edits.
- `backend/api/schemas.py` — `PendingAction`, `GameStateSnapshot` (the latter is Phase 4's target, NOT touched here; `_snapshot()` keeps emitting it byte-identically).

### Call sites to keep working
- `backend/app.py` — FastAPI routes that call `stream_turn` / `stream_deferred_response` (INV-02).
- `backend/cli.py` — session start + turn loop (INV-03 smoke).

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `_handle_result(session, result, queue)` and `_snapshot(session)` in `turn_engine.py` — already shared module-level helpers; the new `_stream_core` calls them as-is.
- `agent.runner.run_agent_iter(deps, message_history, user_prompt | deferred_tool_results, on_thinking)` — the single agent invocation both stream paths wrap. The only inter-path difference is which kwargs are passed.

### Established Patterns
- `@gm_agent.instructions` decorator pattern (`definition.py`) — used for the three dynamic instruction hooks. DEDUP-03 removes only `add_ruleset` (static content); the two state-dependent hooks remain decorated.
- Model-preset / `instructions=` are set once at `Agent(...)` construction in `definition.py` — the natural home for the module-load-time ruleset concatenation.
- Tool docstrings on `@gm_agent.tool` functions in `agent/tools.py` already document tool shape — DEDUP-02 relies on these as the single source of tool documentation after the prompt block is removed.

### Integration Points
- `turn_engine.py` ← `app.py` (HTTP/SSE routes) and `cli.py` (turn loop) are the two consumers of the stream functions — both must keep importing the same names (D-02 preserves them).
- The SSE `game_state` payload is produced by `_snapshot()` → `GameStateSnapshot(...).model_dump()`. This stays byte-identical this phase; it is Phase 4 that replaces `GameStateSnapshot`.

</code_context>

<specifics>
## Specific Ideas

- User consistently chose the lowest-blast-radius option that still satisfies each requirement (named wrappers over a unified function; keep mechanics blocks in the prompt; manual smoke over fixture harness; smoke once at phase end). Planner should favor minimal, surgical diffs and avoid speculative refactors beyond DEDUP-01..04.

</specifics>

<deferred>
## Deferred Ideas

- Pre-captured SSE-fixture + replay/diff harness for refactor parity — considered and declined for this milestone (out of scope per PROJECT.md). Could revisit in a future hardening milestone.
- Moving the Skill-Checks DC ladder / combat mechanics into `core-ruleset.md` — considered during prompt-trim discussion, declined (DC ladder is GM coaching, not ruleset content).
- Resolving `test_tps.py`'s test-like name / pytest config to make discovery explicit — out of DEDUP-04 scope; left as-is.

</deferred>

---

*Phase: 2-backend-dedup-v2-0*
*Context gathered: 2026-05-19*
