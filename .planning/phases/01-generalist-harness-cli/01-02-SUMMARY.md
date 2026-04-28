---
phase: 01-generalist-harness-cli
plan: 02
subsystem: backend_generalist/world
tags: [python, filesystem, templates, bootstrap, tdd]
requires:
  - "(none — independent of Plan 01-01 sandbox at runtime; Plan 04 CLI wires them together)"
provides:
  - "backend_generalist.world.create_session_world"
  - "backend_generalist.world.DEFAULT_TEMPLATE_DIR"
  - "backend_generalist/template_world/ (on-disk seed)"
affects:
  - "Plan 01-04 (CLI calls create_session_world() at session startup)"
  - "Plan 01-03 (agent system prompt assumes pc.json shape from this template)"
tech_stack_added: []
patterns:
  - "shutil.copytree for deep-copy template bootstrap"
  - "uuid.uuid4().hex[:12] for collision-resistant session IDs"
  - "Default sessions_dir = cwd/sessions, created on demand"
key_files_created:
  - backend_generalist/template_world/README.md
  - backend_generalist/template_world/pc.json
  - backend_generalist/template_world/campaign/index.md
  - backend_generalist/template_world/campaign/scene_01.md
  - backend_generalist/template_world/world/scene.json
  - backend_generalist/template_world/world/encounter.json
  - backend_generalist/template_world/rules/core.md
  - backend_generalist/world.py
  - backend_generalist/tests/test_world.py
key_files_modified: []
decisions:
  - "Tests build their own minimal template via tmp_path rather than the on-disk template_world. Decouples test stability from seed-content edits — Plan 01-03/04 may evolve campaign copy without touching test_world.py."
  - "Honored plan's hard '6 test functions' acceptance criterion exactly. Resisted adding a 7th test that would have asserted DEFAULT_TEMPLATE_DIR.is_dir() — that invariant is covered indirectly by the verification block's smoke import and the GREEN smoke run."
  - "Used the venv's python (`backend_generalist/.venv/bin/python`) for every verify command since the system has no `python` shim — same deviation Plan 01-01 documented."
metrics:
  duration_seconds: ~204
  task_count: 2
  file_count: 9
  test_count: 6
  test_passing: 6
completed_date: 2026-04-28
---

# Phase 01 Plan 02: World template + per-session bootstrap

Seeds the on-disk world template (`backend_generalist/template_world/`) and ships `create_session_world()` — the single chokepoint Plan 04's CLI calls at session start to deep-copy the template into a fresh per-session directory.

## What Shipped

### Template directory tree

```
backend_generalist/template_world/
├── README.md               # Tells the agent how the world dir is organized
├── pc.json                 # Pre-generated warrior (Aldric of Corlinn Hill)
├── campaign/
│   ├── index.md            # "The Goblin Ambush" one-shot adventure overview
│   └── scene_01.md         # Opening scene narrative seed
├── world/
│   ├── scene.json          # Mutable scene state (location, mood, NPCs)
│   └── encounter.json      # Mutable combat tracker (enemies, initiative)
└── rules/
    └── core.md             # Minimal d20 ruleset
```

7 plain-text files. No symlinks. PC schema mirrors `backend/game/models.py` (name, character_class, level, stats with might/finesse/wit/presence, hp, hp_max, evasion, gold, inventory, conditions).

### Public API (`backend_generalist/world.py`)

```python
DEFAULT_TEMPLATE_DIR: Path = Path(__file__).parent / "template_world"

def create_session_world(
    template_dir: Path = DEFAULT_TEMPLATE_DIR,
    sessions_dir: Path | None = None,
) -> Tuple[str, Path]:
    """Deep-copy template_dir → sessions_dir/<session_id>/.

    Returns (session_id, abs_session_root). session_id is uuid4 hex[:12].
    sessions_dir defaults to cwd/sessions and is created on demand.
    Raises FileNotFoundError if template_dir is missing.
    """
```

The function does exactly three things: validates the template, ensures the parent sessions dir exists, and `shutil.copytree(template_dir, sessions_dir / session_id)`. Symlinks aren't followed (`copytree` defaults to `symlinks=False`); the template is hand-authored plain files anyway.

## Key Decisions

| Decision | Rationale |
| --- | --- |
| Tests build their own template via `tmp_path` | Decouples test stability from the on-disk template's content. Future plans can edit campaign copy without touching test_world.py. |
| Sessions dir defaults to `cwd / "sessions"` | Predictable for a single-user CLI; user always knows where session data lives. CLI in Plan 04 will print the absolute path on start (CLI-03). |
| `session_id = uuid.uuid4().hex[:12]` (48 bits) | ~16M sessions before 1% collision — way past v1 needs; plan threat T-02-02 documents acceptance. |
| `session_root.resolve()` before return | Returned path is always absolute, so the CLI can print it as-is without re-resolution. |

## Test Results

```
backend_generalist/tests/test_world.py::test_returns_session_id_and_existing_root        PASSED
backend_generalist/tests/test_world.py::test_pc_json_byte_identical_after_copy           PASSED
backend_generalist/tests/test_world.py::test_all_template_subpaths_present_in_copy       PASSED
backend_generalist/tests/test_world.py::test_two_calls_produce_distinct_sessions         PASSED
backend_generalist/tests/test_world.py::test_editing_session_does_not_mutate_template    PASSED
backend_generalist/tests/test_world.py::test_missing_template_raises_file_not_found      PASSED

6 passed in 0.03s
```

Full suite (sandbox + world) passes 15/15 — no Plan 01-01 regression.

| Gate | Commit | State |
| --- | --- | --- |
| TASK 1 (template seed) | `9970a41` `feat(01-02): seed template_world directory tree with playable one-shot` | 7 files, JSON parses, `template ok` snippet exit 0 |
| TASK 2 RED  | `62aec58` `test(01-02): RED — 6 failing tests for create_session_world` | Collection error: `ModuleNotFoundError: No module named 'backend_generalist.world'` (RED, exactly as required) |
| TASK 2 GREEN | `2d4a31a` `feat(01-02): GREEN — implement create_session_world (deep-copy template)` | 6/6 world tests pass; 15/15 overall |

## Verification Checklist

- [x] `python -m pytest backend_generalist/tests/test_world.py -v` → `6 passed in 0.03s` (using venv `python` per environment note)
- [x] `python -c "from backend_generalist.world import create_session_world; sid, root = create_session_world(sessions_dir=Path('/tmp/_gsd_smoke2')); print(sid, root); assert (root / 'pc.json').is_file(); assert (root / 'campaign' / 'index.md').is_file()"` → printed `58c692312317 /private/tmp/_gsd_smoke2/58c692312317`, both asserts pass
- [x] `find backend_generalist/template_world -type l | wc -l` → `0` (no symlinks)
- [x] `find backend_generalist/template_world -type f | wc -l` → `7` (the seven seed files)
- [x] `grep -c "DEFAULT_TEMPLATE_DIR" backend_generalist/world.py` → `2` (≥2, definition + use)
- [x] `grep -c "shutil.copytree" backend_generalist/world.py` → `2` (import comment + call site)
- [x] `grep -c "uuid.uuid4().hex" backend_generalist/world.py` → `2` (docstring + call site)
- [x] `grep -c "^def test_" backend_generalist/tests/test_world.py` → `6` (matches plan's strict `=6`)
- [x] `python -c "from backend_generalist.world import create_session_world, DEFAULT_TEMPLATE_DIR; print(DEFAULT_TEMPLATE_DIR.is_dir())"` → `True`
- [x] Template `pc.json` parses as JSON, `pc['name'] == "Aldric of Corlinn Hill"`, `pc['hp'] == pc['hp_max'] == 12`
- [x] Template `world/encounter.json` parses, `enc['active'] is False`

## Requirements Closed

- **WORLD-01** — Template `backend_generalist/template_world/` exists with `campaign/`, `pc.json`, `world/`, `rules/` subtrees populated.
- **WORLD-02** — `create_session_world()` deep-copies the template into a per-session directory at session start; Plan 04's CLI will call this directly.

WORLD-03 (state persists between turns) is not closed by this plan — it's a property of the integrated CLI in Plan 04. The mechanism is ready: every JSON file in the session is editable, and `shutil.copytree` produces independent files per session.

## Threat Model Compliance

| Threat | Disposition | Status |
| --- | --- | --- |
| T-02-01 Template pollution between sessions | mitigate | Closed — Test 5 (`test_editing_session_does_not_mutate_template`) writes `"corrupted"` to the session copy and asserts the template's bytes are unchanged. |
| T-02-02 Session ID collision | mitigate | 48 bits of entropy via `uuid4().hex[:12]`; Test 4 verifies distinct IDs across sequential calls. Acceptable per plan. |
| T-02-03 Session ID leaked in logs | accept | Local single-user CLI; not addressed at this layer. |
| T-02-04 Symlink in template followed by copytree | mitigate | `find backend_generalist/template_world -type l | wc -l` → `0`. Template is hand-authored plain files. `copytree` default `symlinks=False` is belt-and-braces. |
| T-02-05 sessions/ disk DoS | accept | v2 cleanup concern (HARD-03). |
| T-02-06 sessions_dir defaults to cwd | accept | Plan 04's CLI will print the absolute path at startup (CLI-03). |

## Downstream Impact

- **Plan 01-03** (pydantic-ai agent): the agent's system prompt will reference `pc.json`, `world/scene.json`, `world/encounter.json`, `rules/core.md` as discoverable artifacts. The schemas pinned here (PC stats: might/finesse/wit/presence; encounter: active/enemies/initiative_order/round) are now the contract.
- **Plan 01-04** (CLI + turn loop): bootstraps each session by calling `create_session_world(sessions_dir=Path("sessions"))` at startup and prints the returned `(session_id, session_root)` to satisfy CLI-03.
- The on-disk template is intentionally minimal — agent must be able to fill in scene state via Edit during play, not have everything pre-written. If Plan 04's playtest reveals the agent struggles to discover what it should do, the fix is to enrich `README.md` and `campaign/index.md` (template), not to expand this plan.

## Deviations from Plan

### Auto-fixed adjustments

**1. [Rule 3 - Tooling] Used venv `python` for all verification commands**
- **Found during:** Task 1 verify
- **Issue:** The plan's verify blocks use bare `python -c "..."`; the system has no `python` shim, only `python3` and the project's `backend_generalist/.venv/`.
- **Fix:** Ran every verification with `backend_generalist/.venv/bin/python` (3.12.8). Same deviation Plan 01-01 documented; same fix.
- **Files modified:** none (purely a launcher choice)

**2. [Rule 1 - Bug-style cleanup] Removed an extra 7th test that would have violated the plan's strict acceptance criterion**
- **Found during:** Task 2 RED authoring
- **Issue:** I drafted a 7th test (`test_default_template_dir_points_at_real_template`) for cheap regression coverage. The plan's acceptance criterion states `grep -c "^def test_" backend_generalist/tests/test_world.py` MUST return exactly `6`. Adding the 7th would have failed the criterion.
- **Fix:** Deleted the bonus test before committing. The DEFAULT_TEMPLATE_DIR import-and-truthiness invariant is still verified by the plan's verification-block smoke command and the second `python -c` acceptance check.
- **Files modified:** `backend_generalist/tests/test_world.py` (drafted then trimmed before any commit; only 6 tests appear in `62aec58`)

### Environment notes (not deviations)

- The plan's verify command is `cd /Users/bilunsun/Git/misc/virtualGM && python -m pytest …`. I dropped the `cd` because GSD agents run from the working tree's repo root (already at `/Users/bilunsun/Git/misc/virtualGM`); the result is identical.
- Tests run via the venv pick up `pyproject.toml` rootdir of `backend_generalist/`, but the import path `backend_generalist.tests.test_world` works because pytest is invoked from the repo root and `backend_generalist/` is on `sys.path` via being installable (Plan 01-01's `pyproject.toml`). Verified by the GREEN run.

## Authentication Gates

None — pure local filesystem work, no network, no credentials.

## Known Stubs

None. `create_session_world` is fully implemented. Template files are real seed content (Aldric, Goblin Ambush, d20 rules) — not placeholders.

The `world/scene.json.notes` field is `""` and `world/encounter.json.enemies` is `{}`, but those are intentional — they're scratch areas the agent fills during play, not stubs.

## Self-Check: PASSED

Verification performed after writing this SUMMARY:

- File `backend_generalist/template_world/README.md`: FOUND
- File `backend_generalist/template_world/pc.json`: FOUND
- File `backend_generalist/template_world/campaign/index.md`: FOUND
- File `backend_generalist/template_world/campaign/scene_01.md`: FOUND
- File `backend_generalist/template_world/world/scene.json`: FOUND
- File `backend_generalist/template_world/world/encounter.json`: FOUND
- File `backend_generalist/template_world/rules/core.md`: FOUND
- File `backend_generalist/world.py`: FOUND
- File `backend_generalist/tests/test_world.py`: FOUND
- Commit `9970a41` (Task 1): FOUND in `git log --oneline`
- Commit `62aec58` (Task 2 RED): FOUND
- Commit `2d4a31a` (Task 2 GREEN): FOUND
- Test run on disk: 6 passed (world), 15 passed (full suite), 0 failed
- `grep -c "^def test_" backend_generalist/tests/test_world.py`: `6` (expected `6`)
- `find backend_generalist/template_world -type l | wc -l`: `0` (expected `0`)
- `find backend_generalist/template_world -type f | wc -l`: `7` (expected ≥ `7`)

All success criteria for Plan 01-02 are met.
