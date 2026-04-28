---
phase: 260428-kuu-add-deepseek-v4-flash-preset
plan: 01
type: execute
wave: 1
depends_on: []
files_modified:
  - backend/agent/definition.py
  - backend_generalist/agent.py
  - backend_generalist/cli.py
autonomous: true
requirements:
  - QUICK-01
must_haves:
  truths:
    - "`deepseek-v4-flash` is selectable as a model preset in backend/"
    - "`deepseek-v4-flash` is selectable as a model preset in backend_generalist/"
    - "The CLI `--model` help string lists `deepseek-v4-flash` as an option"
    - "Existing `deepseek` preset and `DEFAULT_MODEL` are unchanged"
  artifacts:
    - path: "backend/agent/definition.py"
      provides: "MODEL_PRESETS with new deepseek-v4-flash entry"
      contains: '"deepseek-v4-flash": ("deepseek/deepseek-v4-flash", "")'
    - path: "backend_generalist/agent.py"
      provides: "DEFAULT_MODEL_PRESETS with new deepseek-v4-flash entry"
      contains: '"deepseek-v4-flash": ("deepseek/deepseek-v4-flash", "")'
    - path: "backend_generalist/cli.py"
      provides: "--model help string mentioning deepseek-v4-flash"
      contains: 'deepseek-v4-flash'
  key_links:
    - from: "backend/agent/definition.py:MODEL_PRESETS"
      to: "OpenRouter model id deepseek/deepseek-v4-flash"
      via: "preset key lookup"
      pattern: "deepseek-v4-flash"
    - from: "backend_generalist/cli.py:--model help"
      to: "backend_generalist/agent.py:DEFAULT_MODEL_PRESETS"
      via: "documented preset name surfaced to user"
      pattern: "deepseek-v4-flash"
---

<objective>
Add a new `deepseek-v4-flash` model preset (mapping to OpenRouter id `deepseek/deepseek-v4-flash`) to both the legacy `backend/` agent and the new `backend_generalist/` harness, and surface the new preset name in the generalist CLI's `--model` help string.

Purpose: Enable selecting DeepSeek's v4-flash model via the existing preset mechanism in both agents, with parity between the two registries.

Output: Three small edits to existing files — no new files, no new tests, no behavior changes beyond the new preset becoming selectable.
</objective>

<execution_context>
@$HOME/.claude/get-shit-done/workflows/execute-plan.md
@$HOME/.claude/get-shit-done/templates/summary.md
</execution_context>

<context>
@CLAUDE.md
@.planning/STATE.md

<interfaces>
<!-- Exact existing shape of the dicts being modified. Do not re-read these files; -->
<!-- the snippets below are the ground truth for this edit. -->

From backend/agent/definition.py (lines 14-24):
```python
# Model presets: name -> (model_id, provider)
MODEL_PRESETS: dict[str, tuple[str, str]] = {
    "m2.5": ("minimax/minimax-m2.5", "sambanova"),
    "deepseek": ("deepseek/deepseek-v3.2", ""),
    "glm-4.7": ("z-ai/glm-4.7", "parasail,google-vertex"),
    "qwen3.5": ("qwen/qwen3.5-397b-a17b", "alibaba"),
    "qwen3.5-27b": ("qwen/qwen3.5-27b", ""),
    "qwen3.5-122b": ("qwen/qwen3.5-122b-a10b", "alibaba"),
    "gemini-flash": ("google/gemini-3-flash-preview", ""),
    "gemini-flash-lite": ("google/gemini-3.1-flash-lite-preview", ""),
}
DEFAULT_MODEL = "qwen3.5"
```

From backend_generalist/agent.py (lines 112-119):
```python
DEFAULT_MODEL_PRESETS: dict[str, tuple[str, str]] = {
    "qwen3.5": ("qwen/qwen3.5-397b-a17b", "alibaba"),
    "qwen3.6-27b": ("qwen/qwen3.6-27b", ""),
    "deepseek": ("deepseek/deepseek-v3.2", ""),
    "glm-4.7": ("z-ai/glm-4.7", "parasail,google-vertex"),
    "gemini-flash": ("google/gemini-3-flash-preview", ""),
}
DEFAULT_MODEL = "qwen3.5"
```

From backend_generalist/cli.py (lines 190-197):
```python
@click.command()
@click.option(
    "--model",
    "-m",
    type=str,
    default=None,
    help="Model preset: qwen3.5 (default), qwen3.6-27b, deepseek, glm-4.7, gemini-flash.",
)
```
</interfaces>
</context>

<tasks>

<task type="auto">
  <name>Task 1: Add deepseek-v4-flash preset across both registries and CLI help</name>
  <files>backend/agent/definition.py, backend_generalist/agent.py, backend_generalist/cli.py</files>
  <action>
Make three small, surgical edits. Do NOT touch any other entries, do NOT change `DEFAULT_MODEL` in either file, and do NOT add new tests or files.

1) `backend/agent/definition.py` — in the `MODEL_PRESETS` dict (starting at line 14), add the following entry on a new line immediately after the existing `"deepseek": ("deepseek/deepseek-v3.2", ""),` line so the two deepseek entries sit adjacent:

```python
    "deepseek-v4-flash": ("deepseek/deepseek-v4-flash", ""),
```

Match the surrounding indentation (4 spaces) and trailing comma exactly.

2) `backend_generalist/agent.py` — in the `DEFAULT_MODEL_PRESETS` dict (starting at line 112), add the same entry on a new line immediately after the existing `"deepseek": ("deepseek/deepseek-v3.2", ""),` line:

```python
    "deepseek-v4-flash": ("deepseek/deepseek-v4-flash", ""),
```

Match the surrounding indentation (4 spaces) and trailing comma exactly.

3) `backend_generalist/cli.py` — update the `--model` click option's `help=` string (around line 196) to mention the new preset. Change:

```
help="Model preset: qwen3.5 (default), qwen3.6-27b, deepseek, glm-4.7, gemini-flash.",
```

to:

```
help="Model preset: qwen3.5 (default), qwen3.6-27b, deepseek, deepseek-v4-flash, glm-4.7, gemini-flash.",
```

Place `deepseek-v4-flash` directly after `deepseek` so the listing groups the deepseek presets together, mirroring the dict ordering.

Notes:
- Use the Edit tool for each file; do not rewrite the whole file.
- Do not adjust unrelated formatting, imports, or whitespace.
- The model id string is exactly `deepseek/deepseek-v4-flash` (lowercase, single hyphen between `v4` and `flash`); the provider field is the empty string `""` (matching the existing `deepseek` entry).
  </action>
  <verify>
    <automated>cd /Users/bilunsun/Git/misc/virtualGM/backend &amp;&amp; python -c "from agent.definition import MODEL_PRESETS; assert 'deepseek-v4-flash' in MODEL_PRESETS, MODEL_PRESETS; assert MODEL_PRESETS['deepseek-v4-flash'] == ('deepseek/deepseek-v4-flash', ''); assert MODEL_PRESETS['deepseek'] == ('deepseek/deepseek-v3.2', ''); print('backend OK:', MODEL_PRESETS['deepseek-v4-flash'])" &amp;&amp; cd /Users/bilunsun/Git/misc/virtualGM/backend_generalist &amp;&amp; python -c "from agent import DEFAULT_MODEL_PRESETS; assert 'deepseek-v4-flash' in DEFAULT_MODEL_PRESETS, DEFAULT_MODEL_PRESETS; assert DEFAULT_MODEL_PRESETS['deepseek-v4-flash'] == ('deepseek/deepseek-v4-flash', ''); assert DEFAULT_MODEL_PRESETS['deepseek'] == ('deepseek/deepseek-v3.2', ''); print('generalist OK:', DEFAULT_MODEL_PRESETS['deepseek-v4-flash'])" &amp;&amp; grep -q 'deepseek-v4-flash' /Users/bilunsun/Git/misc/virtualGM/backend_generalist/cli.py &amp;&amp; echo 'cli help OK'</automated>
  </verify>
  <done>
- `MODEL_PRESETS['deepseek-v4-flash']` in `backend/agent/definition.py` equals `("deepseek/deepseek-v4-flash", "")`.
- `DEFAULT_MODEL_PRESETS['deepseek-v4-flash']` in `backend_generalist/agent.py` equals `("deepseek/deepseek-v4-flash", "")`.
- The existing `"deepseek"` entries and `DEFAULT_MODEL` values are unchanged in both files.
- The `--model` help string in `backend_generalist/cli.py` includes the substring `deepseek-v4-flash`.
- Both Python smoke imports succeed (no `ImportError`, no `AssertionError`).
  </done>
</task>

</tasks>

<verification>
Run the single combined smoke command shown in the task's `<verify>` block. It exercises:
1. Import of `backend/agent/definition.py` and presence + exact value of the new preset.
2. Non-regression of the existing `deepseek` entry in backend.
3. Import of `backend_generalist/agent.py` and presence + exact value of the new preset.
4. Non-regression of the existing `deepseek` entry in backend_generalist.
5. Mention of `deepseek-v4-flash` in the CLI `--model` help string.

If the import path differs (e.g., `backend_generalist` exposes the module under a package name other than `agent`), adapt the import to match the package layout declared in `backend_generalist/pyproject.toml`, but keep the assertions identical.
</verification>

<success_criteria>
- New preset `deepseek-v4-flash` is selectable in both `backend/` and `backend_generalist/` agents.
- The generalist CLI `--model` help text documents the new preset.
- No other presets, defaults, imports, or behavior changed.
- All assertions in the verification command pass.
</success_criteria>

<output>
After completion, create `.planning/quick/260428-kuu-add-deepseek-v4-flash-preset-to-backend-/260428-kuu-SUMMARY.md` summarizing the three edits and the smoke verification result.
</output>
