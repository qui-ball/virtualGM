---
phase: 01-generalist-harness-cli
plan: 03
subsystem: backend_generalist/agent
tags: [python, pydantic-ai, agent, tools, tdd]
requires:
  - "backend_generalist.sandbox.resolve_in_sandbox (Plan 01-01)"
  - "backend_generalist.sandbox.run_bash_in_sandbox (Plan 01-01)"
  - "backend_generalist.sandbox.SandboxEscapeError (Plan 01-01)"
provides:
  - "backend_generalist.tools.read_file"
  - "backend_generalist.tools.write_file"
  - "backend_generalist.tools.edit_file"
  - "backend_generalist.tools.glob_files"
  - "backend_generalist.tools.bash"
  - "backend_generalist.tools.register_tools"
  - "backend_generalist.tools.MAX_BASH_OUTPUT_CHARS"
  - "backend_generalist.agent.GMDeps"
  - "backend_generalist.agent.SYSTEM_PROMPT"
  - "backend_generalist.agent.build_agent"
  - "backend_generalist.agent.DEFAULT_MODEL_PRESETS"
affects:
  - "Plan 01-04 (CLI imports build_agent + GMDeps and drives the turn loop)"
tech_stack_added:
  - "pydantic-ai 1.87.0 installed into backend_generalist/.venv"
patterns:
  - "Imperative tool registration via agent.tool(fn) (single chokepoint in register_tools)"
  - "GMDeps dataclass carries session_root through RunContext.deps; no globals"
  - "Sandbox escape → ModelRetry remap so the agent self-corrects rather than crashing"
  - "Fixed-cap bash output truncation (MAX_BASH_OUTPUT_CHARS=32_000) to bound model context"
key_files_created:
  - backend_generalist/tools.py
  - backend_generalist/agent.py
  - backend_generalist/tests/test_tools.py
key_files_modified: []
decisions:
  - "Imperative `agent.tool(fn)` over the `@agent.tool` decorator — keeps tools pure module-level functions (testable without ctor side effects); the live `backend/` agent uses decorators because tools.py has no separate factory, but this plan benefits from the explicit register_tools chokepoint enforcing the 5-tool surface."
  - "Test fixture uses `types.SimpleNamespace(deps=_Deps(...))` instead of pydantic-ai's RunContext directly. Tools only read `ctx.deps.session_root`, so the shim is sufficient and isolates tests from pydantic-ai version drift."
  - "Reworded SYSTEM_PROMPT to avoid the substring 'narrate' entirely (uses 'narration' / 'describe' instead). Plan acceptance criterion required `grep -cE '(narrate|apply_damage|create_enemy)' agent.py == 0`. The HARN-04 substance — 'reply IS the narration', 'no separate narration tool' — is preserved verbatim; only the bare verb form is replaced."
  - "Bash output cap of 32_000 chars (tunable via MAX_BASH_OUTPUT_CHARS). Threat T-03-05 (DoS via `yes` flood) closed; Test 12 enforces with a 100k-char fixture."
  - "edit_file requires `count == 1` for the snippet match. count==0 → ModelRetry; count>1 → ModelRetry. Tested directly (no-match) and indirectly via the happy-path file content not being multi-occurrence."
metrics:
  duration_seconds: ~250
  task_count: 2
  file_count: 3
  test_count: 12
  test_passing: 12
completed_date: 2026-04-28
---

# Phase 01 Plan 03: pydantic-ai agent + 5 generic tools + system prompt

The agent layer of the generalist harness — a `pydantic-ai` `Agent` armed with EXACTLY five generic tools (read_file, write_file, edit_file, glob_files, bash), each routing through the Plan 01-01 sandbox, and a `SYSTEM_PROMPT` that teaches the agent the world-as-files / reply-is-narration / one-beat-per-turn pattern. Plan 04 (CLI) will import `build_agent` and `GMDeps` and drive the turn loop.

## What Shipped

### The 5 tool signatures (`backend_generalist/tools.py`)

```python
def read_file(ctx: RunContext, path: str) -> str: ...
def write_file(ctx: RunContext, path: str, content: str) -> str: ...
def edit_file(ctx: RunContext, path: str, old: str, new: str) -> str: ...
def glob_files(ctx: RunContext, pattern: str) -> str: ...
def bash(ctx: RunContext, command: str, timeout: float = 120.0) -> str: ...

def register_tools(agent) -> None:
    """Register the 5 generic tools on the given pydantic-ai Agent."""
    agent.tool(read_file)
    agent.tool(write_file)
    agent.tool(edit_file)
    agent.tool(glob_files)
    agent.tool(bash)
```

Routing — the table the project's HARN-02 requirement compiles down to:

| Tool        | Path/cmd primitive used                       | Escape disposition        |
| ----------- | --------------------------------------------- | ------------------------- |
| read_file   | `resolve_in_sandbox(deps.session_root, path)` | SandboxEscapeError → `ModelRetry` |
| write_file  | `resolve_in_sandbox(deps.session_root, path)` | SandboxEscapeError → `ModelRetry` |
| edit_file   | `resolve_in_sandbox(deps.session_root, path)` | SandboxEscapeError → `ModelRetry` |
| glob_files  | leading `/` or `..` rejected; resolved entries filtered against `root.resolve()` | `ModelRetry` on bad pattern; symlink-out filtered silently |
| bash        | `run_bash_in_sandbox(deps.session_root, command, timeout)` | SandboxEscapeError → `ModelRetry` |

`MAX_BASH_OUTPUT_CHARS = 32_000` caps bash output (combined stdout+stderr) with a `\n...[truncated]` suffix to bound the model's context (T-03-05 mitigation).

### `GMDeps` dataclass (`backend_generalist/agent.py`)

```python
@dataclass
class GMDeps:
    session_root: Path
```

Carried via `RunContext.deps` on every tool call. Plan 04's CLI builds one per session: `GMDeps(session_root=create_session_world(...)[1])`.

### `SYSTEM_PROMPT` (3361 chars, embedded in `agent.py`)

Teaches:

- **World-as-files** — "Your working directory is the player's WORLD — a directory of JSON and Markdown files that ARE the live game state."
- **Reply-is-narration** — "Your reply text is what the player sees. There is no separate narration tool — your reply IS the narration."
- **One beat per turn** — "One story beat per turn. 2-4 sentences of narration is usually right."
- **Tool catalog** — names + intended use of all 5 tools (read/write/edit/glob/bash).
- **State-change conventions** — HP in `pc.json` / `world/encounter.json`; inventory in `pc.json.inventory`; scene transitions in `world/scene.json`.
- **Skill checks** — d20 + stat modifier vs DC (8/12/15); stats are Might/Finesse/Wit/Presence (matches Plan 01-02 PC schema).
- **First-turn protocol** — read README.md / pc.json / campaign/index.md / world/scene.json / rules/core.md, then open the scene.

The full prompt text lives in `backend_generalist/agent.py` (commit `3d3141e`).

### `build_agent()` factory

```python
def build_agent(
    model_preset: str = DEFAULT_MODEL,  # "qwen3.5"
) -> tuple[Agent[GMDeps, str], OpenRouterModelSettings]:
```

Constructs `Agent("openrouter:<model_id>", deps_type=GMDeps, output_type=str, instructions=SYSTEM_PROMPT, end_strategy="exhaustive")`, then delegates to `register_tools(agent)`. Returns `(agent, model_settings)` so callers pass `model_settings` into `agent.iter()` / `agent.run()`.

`DEFAULT_MODEL_PRESETS` mirrors the existing `backend/agent/definition.py` shape — name → (model_id, provider). Default: `qwen3.5` → `qwen/qwen3.5-397b-a17b` via Alibaba.

## Test Results

```
backend_generalist/tests/test_tools.py::test_read_file_happy_path                       PASSED
backend_generalist/tests/test_tools.py::test_read_file_rejects_dotdot_escape            PASSED
backend_generalist/tests/test_tools.py::test_write_file_happy_path                      PASSED
backend_generalist/tests/test_tools.py::test_write_file_creates_parent_dirs             PASSED
backend_generalist/tests/test_tools.py::test_write_file_rejects_absolute_escape         PASSED
backend_generalist/tests/test_tools.py::test_edit_file_happy_path                       PASSED
backend_generalist/tests/test_tools.py::test_edit_file_no_match_raises_model_retry      PASSED
backend_generalist/tests/test_tools.py::test_glob_files_happy_path                      PASSED
backend_generalist/tests/test_tools.py::test_glob_files_rejects_escape                  PASSED
backend_generalist/tests/test_tools.py::test_bash_happy_path                            PASSED
backend_generalist/tests/test_tools.py::test_bash_captures_stderr                       PASSED
backend_generalist/tests/test_tools.py::test_bash_truncates_huge_output                 PASSED

12 passed in 0.54s
```

Full suite (sandbox + world + tools): **27/27 passing** — no regression on Plans 01-01 / 01-02.

| Gate | Commit | State |
| ---- | ------ | ----- |
| RED   | `8f15b9b` `test(01-03): RED — 12 failing tests for 5 generic agent tools` | `ModuleNotFoundError: No module named 'backend_generalist.tools'` (collection error) |
| GREEN | `4d11bb0` `feat(01-03): GREEN — implement 5 generic tools routed through sandbox` | 12/12 pass; 27/27 across the full backend_generalist suite |
| Task 2 | `3d3141e` `feat(01-03): build_agent factory + GMDeps + system prompt teaching world-as-files` | Smoke import returns Agent with 5 tools; 27/27 still green |

## Verification Checklist

- [x] `python -m pytest backend_generalist/tests/test_tools.py -v` → `12 passed in 0.54s` (using venv python per environment note)
- [x] Smoke: `from backend_generalist.agent import build_agent; agent, _ = build_agent(); print('agent ok')` → prints `agent ok`. Lists tools: `['bash', 'edit_file', 'glob_files', 'read_file', 'write_file']` (count=5, exactly).
- [x] `grep -cE "(narrate|apply_damage|create_enemy|roll_dice|ask_player_roll|award_xp|add_to_inventory|update_character_state|create_countdown|update_countdown|set_boss_battle|apply_condition|remove_condition|load_campaign_section|unload_campaign_section)" backend_generalist/agent.py backend_generalist/tools.py` → `0` and `0` (no domain-tool names anywhere)
- [x] `grep -cE "^def (read_file|write_file|edit_file|glob_files|bash)\(" backend_generalist/tools.py` → `5`
- [x] `grep -E "from backend_generalist.sandbox import" backend_generalist/tools.py` → matches the import block (`resolve_in_sandbox`, `run_bash_in_sandbox`, `SandboxEscapeError`)
- [x] `grep -E "^def register_tools\(" backend_generalist/tools.py` → `def register_tools(agent) -> None:`
- [x] `grep -c "^def test_" backend_generalist/tests/test_tools.py` → `12`
- [x] `grep -E "from pydantic_ai import Agent" backend_generalist/agent.py` → matches
- [x] `grep -E "@dataclass|class GMDeps" backend_generalist/agent.py` → both match
- [x] `grep -E "^SYSTEM_PROMPT = " backend_generalist/agent.py` → matches
- [x] `grep -ciE "reply IS the narration|reply text is what the player sees" backend_generalist/agent.py` → `2`
- [x] `grep -ciE "JSON files ARE the state|working directory is the player's WORLD" backend_generalist/agent.py` → `3`
- [x] `grep -cE "@agent\.tool|agent\.tool\(" backend_generalist/agent.py` → `0` (≤ 1 — agent.py wires tools only via `register_tools(agent)`)
- [x] SYSTEM_PROMPT length: 3361 chars

## Requirements Closed

- **HARN-01** — Agent's tool surface is EXACTLY {read_file, write_file, edit_file, glob_files, bash}. Locked in via `register_tools()` chokepoint; verified by smoke list (count=5) and by `grep -cE '^def (...)\('` returning 5.
- **HARN-02** — Every tool routes through `resolve_in_sandbox` (read/write/edit/glob) or `run_bash_in_sandbox` (bash). `SandboxEscapeError` is caught and remapped to `ModelRetry` so the agent self-corrects. Tests 2, 5, 9 enforce path-traversal escape behavior.
- **HARN-04** — System prompt teaches: (a) world dir IS game state, (b) JSON files ARE state, (c) reply text IS narration (no narration tool), (d) one beat per turn, (e) call for rolls before narrating outcomes.

## Threat Model Compliance

| Threat | Disposition | Status |
| --- | --- | --- |
| T-03-01 `read_file('../../etc/passwd')` | mitigate | Closed — Test 2 enforces `pytest.raises(ModelRetry)`. |
| T-03-02 `write_file('/tmp/evil.txt', ...)` | mitigate | Closed — Test 5 enforces `pytest.raises(ModelRetry)` AND that `/tmp/_gsd_evil_should_never_exist.txt` does not exist after the call. |
| T-03-03 `glob_files('../**/*')` | mitigate | Closed — Test 9 enforces ModelRetry; the glob_files implementation also re-resolves matches and filters via `relative_to(root.resolve())` to defeat symlinks. |
| T-03-04 `bash("cd / && cat /etc/passwd")` | accept | Documented as accepted risk (full unrestricted Bash, HARN-03). cwd starts at session_root; the sandbox primitive's contract makes that explicit. |
| T-03-05 `bash("yes hello | head -c 100000")` | mitigate | Closed — Test 12 verifies `len(out) <= 33_000` AND output ends with `[truncated]`. `MAX_BASH_OUTPUT_CHARS=32_000`. |
| T-03-06 `bash("sleep 9999")` | mitigate | Closed at the sandbox layer — `run_bash_in_sandbox` enforces `timeout=120.0` default; the `bash` tool propagates the same default. |
| T-03-07 player prompt injection asking for `/etc/passwd` | mitigate | Closed transitively — even if the agent complies, T-03-01 covers the read-side block. |
| T-03-08 `edit_file` with `old=""` | mitigate | Closed — empty `old` would match `len(text)+1` times, hitting the `count > 1` ModelRetry branch. (Verified manually; not a separate test.) |
| T-03-09 no audit log of tool calls | accept | pydantic-ai's per-Run message history serves the v1 audit need; HARD-01 is the v2 logging follow-up. |

## Downstream Impact

Plan 04 (CLI + turn loop) consumes:

```python
from backend_generalist.agent import build_agent, GMDeps
from backend_generalist.world import create_session_world

session_id, session_root = create_session_world(
    sessions_dir=Path("sessions")
)
agent, model_settings = build_agent()  # or build_agent("qwen3.5") explicitly
deps = GMDeps(session_root=session_root)
# then: agent.iter(...) with deps=deps, model_settings=model_settings
```

The 5-tool surface, the GMDeps shape, the build_agent return tuple, and the SYSTEM_PROMPT content are now the contract for Plan 04. Renaming or reshaping any of them would break Plan 04 — treat as frozen for the rest of Phase 01.

## Deviations from Plan

### Auto-fixed adjustments

**1. [Rule 3 - Tooling] Installed pydantic-ai 1.87.0 into the existing venv**
- **Found during:** Task 1 RED smoke (before authoring tests)
- **Issue:** The Plan 01-01 venv (`backend_generalist/.venv/`) had only `pytest` installed. Importing `from pydantic_ai import ModelRetry` in the test file would fail with `ModuleNotFoundError`, masking whether the RED was caused by the missing `tools.py` (the actual TDD signal) or by the missing dependency.
- **Fix:** `uv pip install --python .venv/bin/python "pydantic-ai>=1.25.1"` — installed pydantic-ai 1.87.0 (newer than the pyproject pin's `>=1.25.1` minimum, satisfies the constraint). The pyproject already declares `pydantic-ai>=1.25.1` (Plan 01-01 wrote it); only the venv was unpopulated.
- **Files modified:** none (only the venv contents)
- **Commit:** none — environmental setup, not a code change.

**2. [Rule 1 - Bug-style cleanup] Reworded SYSTEM_PROMPT to remove the bare verb 'narrate' / 'narrating'**
- **Found during:** Task 2 acceptance-criterion grep (`grep -cE "(narrate|apply_damage|create_enemy)" agent.py` initially returned `2`).
- **Issue:** The plan's strict acceptance criterion expects `0` matches across `agent.py + tools.py`. The first-pass SYSTEM_PROMPT used phrases like *"there is no narrate tool"* and *"Never narrate the player character's thoughts"* — both substantively teaching HARN-04, but both also tripping the grep.
- **Fix:** Reworded to *"There is no separate narration tool — your reply IS the narration"* and *"Never describe the player character's thoughts, feelings, or actions — let the player speak for their own character."* The HARN-04 substance is fully preserved (still teaches reply-is-narration; still teaches the player-agency rule); only the bare verb is gone.
- **Files modified:** `backend_generalist/agent.py` (in-flight before commit `3d3141e`)
- **Commit:** `3d3141e` (fix folded into the Task 2 commit; the staged change was already correct).

### Environment notes (not deviations)

- The plan's verify command is `cd /Users/bilunsun/Git/misc/virtualGM && python -m pytest …`. The system has no `python` shim; I ran every verification through `backend_generalist/.venv/bin/python`. Same situation Plan 01-01 / 01-02 documented; same fix.
- `build_agent()` requires `OPENROUTER_API_KEY` to be set even just to construct the Agent (the OpenRouter provider validates the key at construction time, before any network call). The repo's `.env` provides the key; for the smoke test I sourced it: `set -a; source .env; set +a`. Plan 04's CLI will need to load `.env` at startup (likely via `python-dotenv`, already in `pyproject.toml`).

### Tool-registration syntax note

The plan's prescribed implementation uses the imperative form `agent.tool(read_file)` (etc.) inside `register_tools`. The deviation-handling guidance from the orchestrator anticipated a possible fallback to the `@agent.tool` decorator if the imperative form raised under the installed pydantic-ai version. **Verified ahead of time with a smoke script:** `agent.tool(fn)` is a public method on `pydantic_ai.Agent` 1.87.0; both forms work identically. No fallback needed; imperative form was used as written.

## Authentication Gates

None at the test layer. `build_agent()` requires `OPENROUTER_API_KEY` at construction time (OpenRouter provider's contract); this is Plan 04's runtime concern, not Plan 03's. The smoke verification block sources `.env` to satisfy the constraint; tests don't construct an Agent at all (they only exercise the tool functions directly).

## Known Stubs

None. All 5 tools are fully implemented; the system prompt is real instructional text (no TODOs or placeholders); `build_agent()` returns a fully wired Agent. The `SYSTEM_PROMPT` references `world/encounter.json`, `world/scene.json`, `pc.json`, `rules/core.md` — all of which exist as real seed content from Plan 01-02.

## Self-Check: PASSED

Verification performed after writing this SUMMARY:

- File `backend_generalist/tools.py`: FOUND
- File `backend_generalist/agent.py`: FOUND
- File `backend_generalist/tests/test_tools.py`: FOUND
- Commit `8f15b9b` (RED): FOUND in `git log --oneline`
- Commit `4d11bb0` (GREEN, Task 1): FOUND in `git log --oneline`
- Commit `3d3141e` (Task 2): FOUND in `git log --oneline`
- Test run on disk (re-run before writing this section): 12 passed (tools); 27 passed (full backend_generalist suite); 0 failed
- `grep -cE "^def (read_file|write_file|edit_file|glob_files|bash)\(" backend_generalist/tools.py`: `5`
- `grep -cE "(narrate|apply_damage|create_enemy|roll_dice|ask_player_roll|award_xp|add_to_inventory|update_character_state|create_countdown|update_countdown|set_boss_battle|apply_condition|remove_condition|load_campaign_section|unload_campaign_section)" backend_generalist/agent.py backend_generalist/tools.py`: `0` and `0`
- `grep -c "^def test_" backend_generalist/tests/test_tools.py`: `12`
- Smoke import (`from backend_generalist.agent import build_agent; build_agent()`): tools list `['bash', 'edit_file', 'glob_files', 'read_file', 'write_file']`, count=5

All success criteria for Plan 01-03 are met.
