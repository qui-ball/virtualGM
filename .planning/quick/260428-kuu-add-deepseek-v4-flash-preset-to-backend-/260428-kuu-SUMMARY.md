---
phase: 260428-kuu-add-deepseek-v4-flash-preset
plan: 01
subsystem: model-presets
tags: [quick, model-presets, parity]
type: quick
requires: []
provides:
  - "deepseek-v4-flash preset selectable in backend/ via MODEL_PRESETS"
  - "deepseek-v4-flash preset selectable in backend_generalist/ via DEFAULT_MODEL_PRESETS"
  - "--model help text in generalist CLI lists deepseek-v4-flash"
affects:
  - backend/agent/definition.py
  - backend_generalist/agent.py
  - backend_generalist/cli.py
tech-stack:
  added: []
  patterns: [model-preset-registry-parity]
key-files:
  created: []
  modified:
    - backend/agent/definition.py
    - backend_generalist/agent.py
    - backend_generalist/cli.py
decisions:
  - "Inserted new entry adjacent to existing `deepseek` entry in both registries to keep deepseek presets visually grouped (mirrors how the CLI help string now lists them)."
  - "Provider field set to empty string `\"\"`, matching the existing `deepseek` entry — no special routing override for the v4-flash variant."
  - "DEFAULT_MODEL left at `qwen3.5` in both files, per plan constraint."
  - "CLI `--model` help substring updated rather than auto-generated, since the help is a hand-curated subset (the registries also contain non-canonical legacy keys)."
metrics:
  duration: "~2 min (single-task quick plan)"
  completed: "2026-04-28"
---

# Quick Task 260428-kuu: Add `deepseek-v4-flash` Model Preset Summary

One-liner: Added a new `deepseek-v4-flash` preset (mapping to OpenRouter id `deepseek/deepseek-v4-flash`) to both `backend/` and `backend_generalist/` model registries, with the new name also surfaced in the generalist CLI's `--model` help text.

## What Was Built

A surgical three-file edit that registers a new model preset in parallel across the legacy `backend/` agent and the new `backend_generalist/` harness, plus a documentation update so the new preset is discoverable from `--model -h`. No new files, no new tests, no behavior changes beyond the new key becoming selectable.

## Changes

### 1. `backend/agent/definition.py` — `MODEL_PRESETS`

Added one entry immediately after the existing `"deepseek"` entry:

```python
    "deepseek-v4-flash": ("deepseek/deepseek-v4-flash", ""),
```

Existing entries (including `"deepseek"` and `DEFAULT_MODEL = "qwen3.5"`) untouched.

### 2. `backend_generalist/agent.py` — `DEFAULT_MODEL_PRESETS`

Added the same entry immediately after the existing `"deepseek"` entry:

```python
    "deepseek-v4-flash": ("deepseek/deepseek-v4-flash", ""),
```

Existing entries (including `"deepseek"` and `DEFAULT_MODEL = "qwen3.5"`) untouched.

### 3. `backend_generalist/cli.py` — `--model` Click option help

Updated the `help=` string on the `--model` option to list the new preset directly after `deepseek`:

```
Model preset: qwen3.5 (default), qwen3.6-27b, deepseek, deepseek-v4-flash, glm-4.7, gemini-flash.
```

## Verification

The plan's combined smoke command was run (with two adaptations for environment realities — see Deviations):

1. `from agent.definition import MODEL_PRESETS` (cwd=`backend/`) — preset present, value equals `("deepseek/deepseek-v4-flash", "")`, existing `deepseek` still equals `("deepseek/deepseek-v3.2", "")`. **PASS**
2. `from backend_generalist.agent import DEFAULT_MODEL_PRESETS` (cwd=repo root, `--project backend_generalist`) — preset present, value matches, existing `deepseek` unchanged. **PASS**
3. `grep -q 'deepseek-v4-flash' backend_generalist/cli.py` — **PASS**
4. Bonus: `pytest backend_generalist/tests -q` → **38 passed in 1.00s** (no regressions in the generalist suite that depends on `agent.py`).

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 — Blocking] Verification command needed `python` → `uv run python`**

- **Found during:** verification step after the three edits.
- **Issue:** The plan's verify block calls `python -c "..."` directly, but neither `python` nor a system `python3` with `pydantic_ai` installed is on PATH in this environment; both `backend/` and `backend_generalist/` use `uv`-managed virtualenvs.
- **Fix:** Ran the same assertion strings under `uv run --no-sync python -c "..."`. Same code, same assertions, just the correct interpreter selection. No code change required.
- **Files modified:** none.

**2. [Rule 3 — Blocking] `backend_generalist` import name is package-qualified**

- **Found during:** verification step.
- **Issue:** The plan's verify block runs `cd backend_generalist && python -c "from agent import DEFAULT_MODEL_PRESETS"`. That import path doesn't work because `backend_generalist/agent.py` itself imports `from backend_generalist.tools import register_tools` — i.e., the package is registered as `backend_generalist`, not as a top-level module loaded with cwd=`backend_generalist/`. The plan even anticipated this in its `<verification>` note: "If the import path differs … adapt the import to match the package layout declared in `backend_generalist/pyproject.toml`, but keep the assertions identical."
- **Fix:** Verified from the repo root with `uv run --project backend_generalist --no-sync python -c "from backend_generalist.agent import DEFAULT_MODEL_PRESETS; ..."`. Assertions identical to plan; only the import path was adjusted as the plan explicitly authorized.
- **Files modified:** none.

No code-level deviations. The three edits match the plan byte-for-byte (exact strings, exact placement, exact indentation).

## Done Criteria — All Met

- [x] `MODEL_PRESETS['deepseek-v4-flash']` in `backend/agent/definition.py` equals `("deepseek/deepseek-v4-flash", "")`.
- [x] `DEFAULT_MODEL_PRESETS['deepseek-v4-flash']` in `backend_generalist/agent.py` equals `("deepseek/deepseek-v4-flash", "")`.
- [x] Existing `"deepseek"` entries and `DEFAULT_MODEL` values unchanged in both files.
- [x] `--model` help string in `backend_generalist/cli.py` includes `deepseek-v4-flash`.
- [x] Both Python smoke imports succeed (no `ImportError`, no `AssertionError`).

## Commits

- `8f0a852` — `feat(260428-kuu): add deepseek-v4-flash model preset to both agents` (3 files, +3/-1)

## Self-Check: PASSED

- `backend/agent/definition.py` — modified (line 17 contains `"deepseek-v4-flash": ("deepseek/deepseek-v4-flash", ""),`).
- `backend_generalist/agent.py` — modified (line 116 contains the same entry).
- `backend_generalist/cli.py` — modified (line 196 help string lists `deepseek-v4-flash`).
- Commit `8f0a852` exists in git log on branch `gsd/generalist-harness-cli`.
- All plan assertions pass; 38/38 generalist tests pass; diff is exactly +3 / -1 across the three files declared in `files_modified`.
