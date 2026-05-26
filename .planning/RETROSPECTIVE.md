# Project Retrospective

*A living document updated after each milestone. Lessons feed forward into future planning.*

## Milestone: v2.0 — backend-simplification

**Shipped:** 2026-05-26
**Phases:** 3 (Phases 2–4) | **Plans:** 5 | **Commits:** 34

### What Was Built
- Shared SSE turn-stream core (`_stream_core`) replacing two near-duplicate generators; trimmed GM system prompt; static ruleset embedded at module load (Phase 2).
- Tool surface consolidated 17 → 14: inventory pair merged, countdown pair merged, `set_boss_battle` retired (folded into `apply_damage(is_boss=True)` + auto-clear), level-up factored out of `award_xp` (Phase 3).
- `GameState` promoted to a Pydantic `BaseModel` with a hand-built `.snapshot()`; `GameStateSnapshot` mirror and dead `TurnResponse` removed; SSE emits `.snapshot()` directly, byte-identical (Phase 4).

### What Worked
- **Tiered sequencing (2 → 3 → 4) against one invariant.** Holding the SSE wire format byte-compatible gave every phase the same hard pass/fail signal; the golden-path deferred-dice UI smoke caught nothing because nothing broke — exactly the intended outcome.
- **Flagging roadmap drift instead of silently diverging.** The D-02 deviation (`.snapshot()` returns a plain dict, so no trailing `.model_dump()`) was documented in the plan, SUMMARY, and requirements rather than quietly implemented — kept the byte-compat claim auditable.
- **Correcting a wrong baseline early (D-10).** The roadmap's "~15 → ≤11" tool target was anchored to a miscount; verifying the real registered count (17) before planning avoided over-merging.

### What Was Inefficient
- **A single-plan phase still paid full worktree-isolation overhead.** Phase 4 had one sequential plan, yet ran through worktree spawn + merge-back + lock-cleanup machinery that exists for parallel isolation. The locked-worktree removal needed a manual `unlock`/`prune` fallback.
- **`cwd` drift broke gsd-sdk mid-flow.** A `cd backend` for pytest left later `gsd-sdk`/planning lookups resolving against the wrong root, briefly making planning files look "missing." Always return to repo root before SDK/git calls.
- **Auto-extracted milestone accomplishments were noisy.** `milestone.complete` pulled v1.0 SUMMARY fragments ("[Rule 3 - Tooling]…") into the MILESTONES.md entry; required manual curation.

### Patterns Established
- **`exclude=True` for serialized-but-public fields, `PrivateAttr` for runtime-only fields** on shared state models (D-03/D-04), with no `validate_assignment` so in-place mutation keeps plain-class semantics (D-05).
- **Pin wire-format invariants with a committed byte-compat test** (reconstruct the prior shape, assert `json.dumps(sort_keys=True)` equality) — not just shape/key-name tests.

### Key Lessons
1. When a refactor's whole value rests on an output being unchanged, write the equivalence test, not just structural tests — the manual check doesn't guard CI.
2. Hand-built "snapshot" dicts must copy mutable containers (the `countdowns` aliasing fix) to match the defensive-copy semantics callers expect from a method named `snapshot`.
3. For single sequential plans, worktree isolation adds cost without benefit; consider `use_worktrees=false` for such phases.

### Cost Observations
- Model mix: ~100% opus (Opus 4.7, 1M context) for orchestration + executor/reviewer/fixer subagents.
- Notable: subagent-per-plan execution kept orchestrator context lean; code-review + fix loop caught two latent traps (countdowns aliasing, missing byte-compat test) post-UAT.

---

## Cross-Milestone Trends

### Process Evolution

| Milestone | Phases | Key Change |
|-----------|--------|------------|
| v1.0 generalist-viability-spike | 1 | Coarse single-phase spike; user self-validates e2e play |
| v2.0 backend-simplification | 3 | Tiered refactor against a byte-compat invariant; per-phase UAT + end-of-phase code review |

### Cumulative Quality

| Milestone | Tests (phase-local) | Notable |
|-----------|---------------------|---------|
| v1.0 | 65/65 across 4 plans | viability `play passed` over 7 sessions |
| v2.0 | 10/10 (Phase 4 models) | frontend wire format held byte-compatible across 3 phases |

### Top Lessons (Verified Across Milestones)

1. A single hard, observable invariant (here: the SSE wire format) makes staged refactors safe and verifiable.
2. Strict schemas at boundaries are worth keeping — the v1.0 spike proved the generalist harness works, but v2.0 confirmed typed state is the right trade for the live UI.
