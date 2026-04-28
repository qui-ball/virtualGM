---
phase: 01-generalist-harness-cli
plan: 01
subsystem: backend_generalist/sandbox
tags: [python, filesystem, sandbox, security, tdd]
requires: []
provides:
  - "backend_generalist.sandbox.resolve_in_sandbox"
  - "backend_generalist.sandbox.run_bash_in_sandbox"
  - "backend_generalist.sandbox.SandboxEscapeError"
affects:
  - "downstream plans 01-02, 01-03, 01-04 (every tool wrapper imports from here)"
tech_stack_added:
  - "pytest>=8.0 (dev dep, installed at backend_generalist/.venv/)"
patterns:
  - "Path.resolve(strict=False) + containment check via `root in resolved.parents`"
  - "subprocess.run with explicit list form (no shell=True), cwd-locked, text=True"
key_files_created:
  - backend_generalist/__init__.py
  - backend_generalist/pyproject.toml
  - backend_generalist/sandbox.py
  - backend_generalist/tests/__init__.py
  - backend_generalist/tests/test_sandbox.py
  - backend_generalist/.gitignore
key_files_modified: []
decisions:
  - "Symlink containment is enforced implicitly: `Path.resolve()` follows the symlink, then `root in resolved.parents` rejects targets outside the root. No separate symlink walk needed."
  - "Bash uses `[\"bash\", \"-c\", command]` explicit list form, never `shell=True` — avoids a second layer of shell parsing while keeping full Bash inside the spawned shell."
  - "Bash is unrestricted by design (HARN-03). The accepted risk T-01-05 (`cd /etc && cat passwd`) is documented in the plan's threat model."
metrics:
  duration_seconds: ~480
  task_count: 2
  file_count: 6
  test_count: 9
  test_passing: 9
completed_date: 2026-04-28
---

# Phase 01 Plan 01: Sandbox primitive + backend_generalist package skeleton

Sandbox primitive that confines all filesystem and shell ops in `backend_generalist/` to the active session world directory; bootstraps the parallel package skeleton so plans 02-04 can import from `backend_generalist.sandbox`.

## What Shipped

**Public API (`backend_generalist/sandbox.py`):**

```python
class SandboxEscapeError(ValueError): ...

def resolve_in_sandbox(session_root: Path, candidate: str | Path) -> Path:
    """Resolve candidate against session_root, reject escapes, allow non-existent targets."""

def run_bash_in_sandbox(
    session_root: Path,
    command: str,
    timeout: float = 120.0,
) -> subprocess.CompletedProcess[str]:
    """Run via `bash -c` with cwd locked to session_root; raises TimeoutExpired."""
```

**Package skeleton:**

- `backend_generalist/__init__.py` — `__version__ = "0.1.0"`.
- `backend_generalist/pyproject.toml` — declares the package as installable (`name = "backend_generalist"`, `requires-python = ">=3.12"`, `pydantic-ai>=1.25.1`, `click`, `loguru`, `python-dotenv`; dev extra: `pytest>=8.0`; build-backend: `hatchling`).
- `backend_generalist/tests/test_sandbox.py` — 9 tests pinning the contract.
- `backend_generalist/.gitignore` — excludes `.venv/`, `__pycache__/`, `.pytest_cache/`.

## Key Decisions

| Decision | Rationale |
| --- | --- |
| `Path.resolve(strict=False)` + `root in resolved.parents` | `strict=False` lets Write target a not-yet-existing file. `resolve()` follows symlinks, so the same containment check covers `..`, absolute, and symlink-out escapes uniformly — no separate walk. |
| `subprocess.run(["bash", "-c", command])`, never `shell=True` | Avoids double-shell parsing and ensures `cwd=session_root` is honored. The agent still has full Bash inside the spawned shell — no whitelisting (HARN-03 / accepted risk T-01-05). |
| Bash timeout default = 120 s | Matches plan; lets `sleep 5; timeout=0.1` propagate `subprocess.TimeoutExpired` (Test 9) so DoS risk T-01-06 is mitigated by default. |
| Tests live under `backend_generalist/tests/` with a real `__init__.py` | Makes `backend_generalist.sandbox` importable from tests via the same Python path the agent will use. |

## Test Results

```
backend_generalist/tests/test_sandbox.py::test_resolve_happy_path                     PASSED
backend_generalist/tests/test_sandbox.py::test_resolve_nested_happy_path              PASSED
backend_generalist/tests/test_sandbox.py::test_resolve_rejects_dotdot_escape          PASSED
backend_generalist/tests/test_sandbox.py::test_resolve_rejects_absolute_escape        PASSED
backend_generalist/tests/test_sandbox.py::test_resolve_rejects_symlink_escape         PASSED
backend_generalist/tests/test_sandbox.py::test_resolve_allows_nonexistent_target      PASSED
backend_generalist/tests/test_sandbox.py::test_bash_cwd_confinement                   PASSED
backend_generalist/tests/test_sandbox.py::test_bash_captures_stdout_and_stderr        PASSED
backend_generalist/tests/test_sandbox.py::test_bash_timeout_propagates                PASSED

9 passed in 0.13s
```

| Gate | Commit | State |
| --- | --- | --- |
| RED   | `3ddd2ac` `test(01-01): RED — bootstrap backend_generalist + 9 failing sandbox tests` | Tests fail with `ModuleNotFoundError: No module named 'backend_generalist.sandbox'` (collection error) |
| GREEN | `5e4c111` `feat(01-01): GREEN — implement sandbox.py confining FS+shell to session root` | 9/9 tests pass |

## Verification Checklist

- [x] `python -m pytest backend_generalist/tests/test_sandbox.py -v` → 9 passed, 0 failed
- [x] `python -c "from backend_generalist.sandbox import resolve_in_sandbox, run_bash_in_sandbox, SandboxEscapeError; print('ok')"` → `ok`
- [x] `grep -c "shell=True" backend_generalist/sandbox.py` → `0`
- [x] `grep -E "is_relative_to|in resolved.*\.parents|commonpath" backend_generalist/sandbox.py` → matches `if root in resolved.parents:`
- [x] `ls backend_generalist/` shows `__init__.py`, `pyproject.toml`, `sandbox.py`, `tests/` (plus the gitignored `.venv/` and `__pycache__/`)
- [x] `grep -c "^def test_" backend_generalist/tests/test_sandbox.py` → `9`

## Requirements Closed

- HARN-02 — every filesystem path the agent will pass to Read/Write/Edit/Glob now has a single confinement chokepoint (`resolve_in_sandbox`).
- HARN-03 — Bash invocations route through `run_bash_in_sandbox` with `cwd=session_root` (the only confinement, by design).

Both requirements are mechanism-level closures — Plans 02-04 will exercise them through the actual tool wrappers and the CLI turn loop.

## Threat Model Compliance

| Threat | Disposition | Status |
| --- | --- | --- |
| T-01-01 `..` escape | mitigate | Closed — Test 3 enforces. |
| T-01-02 absolute escape | mitigate | Closed — Test 4 enforces. |
| T-01-03 symlink escape | mitigate | Closed — Test 5 enforces (`os.symlink("/tmp", root/"link")` then `link/foo` raises). |
| T-01-04 EoP via Write | mitigate | Closed — Test 6 covers non-existent target; same `resolve_in_sandbox` chokepoint. |
| T-01-05 `cd` inside Bash | accept | Documented as accepted risk in plan; CLAUDE.md / PROJECT.md confirm full unrestricted Bash. |
| T-01-06 `sleep 99999` DoS | mitigate | Closed — Test 9 enforces `subprocess.TimeoutExpired` propagation; default `timeout=120`. |
| T-01-07 path-in-logs info disclosure | accept | No logging added in this plan; benign at v1. |
| T-01-08 session-id collision | accept | Out of scope; lives in Plan 02. |

## Downstream Impact

Plans 01-02, 01-03, 01-04 import from `backend_generalist.sandbox`. The public symbols above are now their contract. Renaming or reshaping them would break those plans — treat the API as frozen for the rest of Phase 01.

Specifically:
- **01-02** (world template + per-session bootstrap) will call `resolve_in_sandbox(session_root, sub_path)` for every file written into the freshly-copied session dir.
- **01-03** (pydantic-ai agent + 5 generic tools) will wrap each tool body with `resolve_in_sandbox` (Read/Write/Edit/Glob) or `run_bash_in_sandbox` (Bash).
- **01-04** (CLI + turn loop) creates the `session_root` value that the other two plans pass through.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Tooling] Added `backend_generalist/.gitignore`**
- **Found during:** Task 1 (after `uv venv` materialised `.venv/`)
- **Issue:** `uv venv .venv` created a 30 MB venv inside `backend_generalist/` that would otherwise be picked up by `git status` and risk being committed.
- **Fix:** Added `.gitignore` excluding `.venv/`, `__pycache__/`, `.pytest_cache/`. The plan's `files_modified` list does not enumerate `.gitignore` but adding one is plainly required for hygiene given the venv had to live somewhere; I chose the package directory rather than polluting the repo root.
- **Files modified:** `backend_generalist/.gitignore`
- **Commit:** `3ddd2ac` (folded into RED commit alongside the test scaffolding)

### Environment notes (not deviations)

- The plan's verify command is `python -m pytest …`. The system has no `python` (only `python3` and `uv`-managed environments). I created a dedicated `backend_generalist/.venv` via `uv venv --python 3.12 .venv` and installed `pytest` into it; tests were run via `backend_generalist/.venv/bin/python -m pytest …`. The acceptance criterion ("Running pytest fails with import error / passes 9") is satisfied; only the launcher is `python3` (via the venv's `python`) instead of bare `python`.
- The plan's verify literal expected `9 errors` from pytest collection. With a real `tests/__init__.py` (which the plan itself prescribes), pytest fails on package import once and reports `1 error` rather than 9 — same RED signal, different shape. I confirmed by reading the failure: `E ModuleNotFoundError: No module named 'backend_generalist.sandbox'`. Acceptance criterion is "fails with collection or import error referencing the missing `backend_generalist.sandbox` module" — satisfied.

## Authentication Gates

None — pure local filesystem + subprocess work, no network, no credentials.

## Known Stubs

None. Both functions are fully implemented; there are no placeholder returns or mock data paths flowing into anything.

## Self-Check: PASSED

Verification performed after writing this SUMMARY:

- File `backend_generalist/sandbox.py`: FOUND
- File `backend_generalist/__init__.py`: FOUND
- File `backend_generalist/pyproject.toml`: FOUND
- File `backend_generalist/tests/__init__.py`: FOUND
- File `backend_generalist/tests/test_sandbox.py`: FOUND
- Commit `3ddd2ac` (RED): FOUND in `git log --oneline`
- Commit `5e4c111` (GREEN): FOUND in `git log --oneline`
- Test run on disk: 9 passed, 0 failed (re-run before writing this section)
- `grep -c "shell=True" backend_generalist/sandbox.py`: `0` (expected `0`)
- `grep -c "^def test_" backend_generalist/tests/test_sandbox.py`: `9` (expected `9`)

All success criteria for Plan 01-01 are met.
