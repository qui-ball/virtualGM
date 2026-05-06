---
phase: 260506-fuv
plan: 01
subsystem: agent-prompt + world-template
tags: [quick-task, gm-leak, system-prompt, gm-only, read-aloud, lmop]
type: quick
requirements: [QUICK-260506-fuv]
dependency_graph:
  requires: []
  provides: ["GM information boundary contract enforced via prompt + gm_-prefix data convention + read-aloud markers"]
  affects:
    - backend_generalist/agent.py
    - backend_generalist/template_world/world/scene.json
    - backend_generalist/template_world/README.md
    - backend_generalist/template_world/campaign/Introduction/Adventure_Hook.md
    - backend_generalist/template_world/campaign/Part1_Goblin_Arrows/Overview.md
    - backend_generalist/template_world/campaign/Part1_Goblin_Arrows/Goblin_Ambush.md
    - backend_generalist/tests/test_information_boundary.py
tech_stack:
  added: []
  patterns:
    - "GitHub-flavored admonition `> [!read-aloud]` callouts to mark player-perceivable campaign passages"
    - "`gm_`-prefixed JSON keys flag GM-only fields (template-only, no migration logic)"
key_files:
  created:
    - backend_generalist/tests/test_information_boundary.py
  modified:
    - backend_generalist/agent.py
    - backend_generalist/template_world/world/scene.json
    - backend_generalist/template_world/README.md
    - backend_generalist/template_world/campaign/Introduction/Adventure_Hook.md
    - backend_generalist/template_world/campaign/Part1_Goblin_Arrows/Overview.md
    - backend_generalist/template_world/campaign/Part1_Goblin_Arrows/Goblin_Ambush.md
decisions:
  - "Place ## Information Boundary AFTER ## World Files and BEFORE ## GM Narrative Style — boundary precedes voice."
  - "Wrap 'Wit check' on a single source line so the literal substring is preserved across triple-quote line breaks (verifier checks for 'Wit check' as a contiguous substring)."
  - "Goblin_Ambush.md: read-aloud callout wraps ONLY the discovered-horses paragraph; the 'Four goblins are hiding…' line stays bare GM-only — that line was the original session leak."
  - "Skip Cragmaw_Hideout.md and Parts 2-4 callouts — out of scope for this quick fix."
  - "scene.json key rename, not duplicate, since no Python code reads `notes` by key (verified via grep)."
metrics:
  tasks_completed: 2
  files_modified: 6
  files_created: 1
  lines_changed: 88
  duration: "~10 min"
  completed: "2026-05-06"
commits:
  - 687d274
  - 4394942
---

# Phase 260506-fuv Plan 01: Fix GM Information Leakage in backend_generalist Summary

**One-liner:** Closes the observed playtest leak where the GM revealed hidden ambushers and meta-narrated "Wit check" prompts to the player by adding an explicit `## Information Boundary` section to `SYSTEM_PROMPT`, renaming `scene.json` `notes`→`gm_notes` (with documented `gm_`-prefix convention), wrapping player-perceivable Part 1 opener passages in `> [!read-aloud]` callouts, and pinning the contract with three pytest cases.

## What Changed

### Task 1 — `687d274` — prompt + gm_-prefix scaffolding (3 files)

**`backend_generalist/agent.py`**: New `## Information Boundary` section inserted into `SYSTEM_PROMPT` between `## World Files` and `## GM Narrative Style`. Five required key phrases present: `GM-only`, `gm_`, `read-aloud`, `Wit check`, `Boxed text`.

**`backend_generalist/template_world/world/scene.json`**: Top-level key `"notes"` renamed to `"gm_notes"`; value preserved verbatim. No other keys changed. No backwards-compat shim (template is fresh per session).

**`backend_generalist/template_world/README.md`**: `world/scene.json` bullet rewritten to mention `gm_`-prefixed fields and the convention that anything prefixed `gm_` is GM-only.

### Task 2 — `4394942` — read-aloud callouts + boundary tests (4 files)

**`Adventure_Hook.md`**: "Meet Me in Phandalin" hook paragraph wrapped in `> [!read-aloud]` callout. The leading "You can let players invent…" GM directive remains OUTSIDE the callout.

**`Part1_Goblin_Arrows/Overview.md`**: Adventure-opening paragraph ("The adventure begins as the player characters are escorting…") wrapped in `> [!read-aloud]`. The downstream "Read the boxed text when you're ready…" GM directives and bulleted GM checklist remain OUTSIDE the callout.

**`Part1_Goblin_Arrows/Goblin_Ambush.md`**: The discovered-horses passage (Gundren/Sildar identification + "When the characters inspect the scene closer…") wrapped in `> [!read-aloud]`. **CRITICAL:** "Four goblins are hiding in the woods, two on each side of the road. They wait until someone approaches the bodies and then attack." stays bare on its own line, NOT inside the callout — that line was the exact source of the original session leak.

**`backend_generalist/tests/test_information_boundary.py`**: New module with 3 pytest functions:
- `test_system_prompt_declares_information_boundary` — asserts the section header + 5 key phrases.
- `test_scene_template_uses_gm_prefixed_notes` — asserts `gm_notes` present, plain `notes` absent.
- `test_marked_campaign_files_have_read_aloud_callouts` — asserts callouts on all 3 marked opener files AND that the leak line stays OUTSIDE any callout in `Goblin_Ambush.md`.

## Why

Real playtest leak observed: the agent narrated to the player

> "Around you, the woodland is quiet. Too quiet."
> "(If you state an action to look for hidden threats, I'll call for a Wit check to see if you spot the ambushers hiding in the brush.)"

Two distinct leaks:

1. **Hidden content leak** — "ambushers hiding in the brush" was pulled from `Goblin_Ambush.md` line 7 ("Four goblins are hiding…") and `world/scene.json` `notes` foreshadowing — both GM-only material.
2. **Resolution-layer meta-narration** — "I'll call for a Wit check" addresses the player as a player, not the character; pre-tells the resolution path and breaks immersion.

The fix establishes a mechanically-applicable boundary: `gm_`-prefixed fields and unmarked `campaign/` paragraphs are GM-only; only `> [!read-aloud]`-marked passages may be paraphrased verbatim.

## Verification

| Check | Result |
| ----- | ------ |
| `## Information Boundary` section present in SYSTEM_PROMPT | PASS |
| All 5 key phrases (`GM-only`, `gm_`, `read-aloud`, `Wit check`, `Boxed text`) in SYSTEM_PROMPT | PASS |
| `scene.json` has `gm_notes`; no plain `notes` key | PASS |
| `gm_notes` value preserved verbatim ("goblin ambush will trigger" substring intact) | PASS |
| `README.md` documents `gm_` prefix + `gm_notes` field | PASS |
| 3 opener files contain `> [!read-aloud]` | PASS |
| `Goblin_Ambush.md` "Four goblins are hiding…" line stays OUTSIDE any callout | PASS |
| `tests/test_information_boundary.py` — 3/3 tests pass | PASS |
| Full `backend_generalist` test suite — `48 passed in 0.99s` (45 prior + 3 new) | PASS |

```
$ uv --directory backend_generalist run --extra dev pytest tests/test_information_boundary.py -x -v
collected 3 items

tests/test_information_boundary.py::test_system_prompt_declares_information_boundary PASSED [ 33%]
tests/test_information_boundary.py::test_scene_template_uses_gm_prefixed_notes PASSED [ 66%]
tests/test_information_boundary.py::test_marked_campaign_files_have_read_aloud_callouts PASSED [100%]

============================== 3 passed in 0.74s ===============================
```

## Done Criteria

- [x] `SYSTEM_PROMPT` contains `## Information Boundary` with 5 required key phrases
- [x] `scene.json` has `gm_notes` (no `notes` key); value preserved
- [x] `README.md` documents `gm_` prefix convention
- [x] `Adventure_Hook.md`, `Overview.md`, `Goblin_Ambush.md` carry `> [!read-aloud]` callouts on the correct passages
- [x] `Goblin_Ambush.md` "Four goblins are hiding…" remains OUTSIDE every callout (regression-pinned by test)
- [x] `tests/test_information_boundary.py` exists and passes (3/3)
- [x] Full `pytest tests/` suite passes (48/48)
- [x] Two atomic code commits, one per task

## Deviations from Plan

**1. [Rule 1 - Bug] Wrapped "Wit check" onto one line so the substring is contiguous**
- **Found during:** Task 1 verification — the inline assertion `'Wit check' in SYSTEM_PROMPT` failed.
- **Issue:** As-spec'd, the prompt body broke `Wit\ncheck` across two lines. In a Python triple-quoted string the line break renders as `\n`, so the literal substring `"Wit check"` was not present — even though the plan's verifier (and the new pytest case) both check for that contiguous substring.
- **Fix:** Reflowed the line so "I'll call for a / Wit check" became "I'll call for a / Wit check" — i.e. moved the line break before `Wit` rather than between `Wit` and `check`. Body content unchanged.
- **Files modified:** `backend_generalist/agent.py`
- **Commit:** `687d274` (the fix landed inside the same Task-1 commit because the verification gate caught it before the commit was made)

No other deviations. The remaining 6 file modifications matched the plan verbatim, including the precise location of the read-aloud callout boundary on `Goblin_Ambush.md` (which was the explicit critical-regression guard).

## Commits

| Type  | Hash    | Message                                                                        |
| ----- | ------- | ------------------------------------------------------------------------------ |
| `fix` | 687d274 | fix(260506-fuv): establish GM information boundary (prompt + gm_-prefix)       |
| `fix` | 4394942 | fix(260506-fuv): mark read-aloud passages and pin boundary tests               |

## Self-Check: PASSED

- File `backend_generalist/agent.py` — FOUND (modified)
- File `backend_generalist/template_world/world/scene.json` — FOUND (modified)
- File `backend_generalist/template_world/README.md` — FOUND (modified)
- File `backend_generalist/template_world/campaign/Introduction/Adventure_Hook.md` — FOUND (modified)
- File `backend_generalist/template_world/campaign/Part1_Goblin_Arrows/Overview.md` — FOUND (modified)
- File `backend_generalist/template_world/campaign/Part1_Goblin_Arrows/Goblin_Ambush.md` — FOUND (modified)
- File `backend_generalist/tests/test_information_boundary.py` — FOUND (created)
- File `.planning/quick/260506-fuv-fix-gm-information-leakage-in-backend-ge/260506-fuv-SUMMARY.md` — created (this file)
- Commit `687d274` — FOUND in `git log`
- Commit `4394942` — FOUND in `git log`
