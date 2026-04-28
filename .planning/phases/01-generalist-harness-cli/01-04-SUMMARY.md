---
phase: 01-generalist-harness-cli
plan: 04
subsystem: backend_generalist/cli
tags: [python, click, asyncio, integration, playtest, rich, ui]
requires:
  - "backend_generalist.world.create_session_world (Plan 01-02)"
  - "backend_generalist.agent.build_agent (Plan 01-03)"
  - "backend_generalist.agent.GMDeps (Plan 01-03)"
provides:
  - "backend_generalist.cli.main (Click entry point)"
  - "backend_generalist.cli.run_chat (async turn-loop driver)"
  - "backend_generalist.__main__ (so `python -m backend_generalist` works)"
  - "Read-only subtree enforcement on `campaign/` and `rules/` (tools.py)"
  - "Rich-rendered narration + tool-call telemetry (cli.py)"
  - "Full Lost Mine of Phandelver campaign content (template_world/campaign/)"
affects:
  - "Closes Phase 01 — viability spike has produced a verdict"
tech_stack_added:
  - "rich>=13.0 (Markdown rendering + colored tool-call telemetry)"
  - "hatch wheel build config in backend_generalist/pyproject.toml"
  - "uv.lock checked in"
patterns:
  - "pydantic-ai node iteration (`async for node in agent.iter`) to surface ToolCallPart / ToolReturnPart / ThinkingPart for live UI telemetry"
  - "Read-only top-level subtree convention: write_file/edit_file inspect the resolved path's first segment and raise ModelRetry for `campaign/` and `rules/`; read_file/glob_files/bash unaffected"
  - "Synthetic opening prompt on first turn so the agent narrates without waiting on stdin"
  - "load_dotenv() at import time so OPENROUTER_API_KEY is available before build_agent constructs the OpenRouter provider"
key_files_created:
  - backend_generalist/cli.py
  - backend_generalist/__main__.py
  - backend_generalist/tests/test_cli.py
  - backend_generalist/uv.lock
  - "backend_generalist/template_world/campaign/Introduction/ (6 files)"
  - "backend_generalist/template_world/campaign/Part1_Goblin_Arrows/ (3 files)"
  - "backend_generalist/template_world/campaign/Part2_Phandalin/ (6 files)"
  - "backend_generalist/template_world/campaign/Part3_The_Spiders_Web/ (8 files)"
  - "backend_generalist/template_world/campaign/Part4_Wave_Echo_Cave/ (7 files)"
  - "backend_generalist/template_world/campaign/Appendix_A_Magic_Items/ (3 files)"
  - "backend_generalist/template_world/campaign/Appendix_B_Monsters/ (3 files)"
key_files_modified:
  - backend_generalist/tools.py
  - backend_generalist/tests/test_tools.py
  - backend_generalist/agent.py
  - backend_generalist/pyproject.toml
  - backend_generalist/template_world/README.md
  - backend_generalist/template_world/campaign/index.md
  - backend_generalist/template_world/world/scene.json
key_files_deleted:
  - backend_generalist/template_world/campaign/scene_01.md
decisions:
  - "Closed Task 2 (human checkpoint) with verdict `play passed`. Generalist harness ran a coherent multi-turn slice; state survived across turns via JSON edits; agent narration coherent without any dedicated narration tool."
  - "Read-only enforcement on `campaign/` + `rules/` subtrees via tools.py (not bash). Bash is intentionally not guarded — full unrestricted Bash is an explicit project decision (HARN-03). Agent can still escape via bash, but every escape is visible in the tool-call log."
  - "Tool-call telemetry rendered inline via Rich + pydantic-ai node iteration. Trade-off: Markdown narration is now post-rendered as a single block (instead of streamed token-by-token), but tool-call visibility was the dominant friction point during playtest."
  - "Replaced placeholder `scene_01.md` with the full LMoP campaign content (Introduction, Parts 1-4, Appendix A magic items, Appendix B monsters). The template campaign is now real published-adventure material; `campaign/index.md` serves as the TOC the agent reads first."
  - "Added qwen3.6-27b model preset to DEFAULT_MODEL_PRESETS for playtesting variants."
  - "Added `[tool.hatch.build.targets.wheel] packages = ['.']` to pyproject.toml. Without it, hatch refuses to build because there's no top-level package matching the project name (the project IS the directory). Allows `uv sync` / wheel install to succeed."
metrics:
  duration_seconds: ~1500
  task_count: 2
  file_count: 50
  test_count: 38
  test_passing: 38
  sessions_played: 7
completed_date: 2026-04-28
---

# Phase 01 Plan 04: CLI entry point + turn loop + playtest checkpoint

The integration plan that made the spike playable — and the human checkpoint that answered the viability question. After commit `2d1251d` wired the CLI per the plan, multi-session playtesting (7 sessions under `sessions/`) surfaced three sources of friction that were addressed in commit `ebb8b5f`. The user's qualitative verdict: **`play passed`** — the generalist-harness hypothesis holds.

## What Shipped

### Task 1 — CLI wiring (commit `2d1251d`)

- `backend_generalist/cli.py` (initial 119 lines): Click `main()` with `--model` and `--sessions-dir`; `async def run_chat()` that bootstraps a per-session world dir via `create_session_world()`, builds the agent via `build_agent()`, and drives a stdin → `agent.iter()` → stdout turn loop. Synthetic opening prompt so the agent opens the scene without waiting on stdin. Exit on Ctrl-C / EOF / exit token; `try/finally` prints the world dir on the way out so the user can inspect.
- `backend_generalist/__main__.py` (5 lines): thin module entry; enables `python -m backend_generalist`.
- `backend_generalist/tests/test_cli.py` (initial 156 lines, 4 tests): offline smoke tests with a mocked agent — `--help` exits 0, `run_chat` bootstraps the session dir + prints `[session] id=` and `[session] world=`, Ctrl-C preserves session JSON intact, `__main__` delegates to `cli.main`.
- `load_dotenv()` at import time so `OPENROUTER_API_KEY` is available before `build_agent` constructs the OpenRouter provider (which validates the key at construction time, before any network call). Plan 03's SUMMARY explicitly flagged this as Plan 04's concern.

Verification: 4/4 CLI smoke tests passed; 31/31 full backend_generalist suite green; `python -m backend_generalist --help` exited 0.

### Task 2 — Human checkpoint + post-playtest hardening (commit `ebb8b5f`)

The user played 7 sessions and observed three friction points. Each was addressed in the same commit:

**1. Agent tampered with reference material.** During play, the agent occasionally attempted to write or edit files under `campaign/` (the published adventure) instead of writing live state to `pc.json` / `world/`. Added read-only subtree enforcement in `tools.py`:

```python
READ_ONLY_PREFIXES: tuple[str, ...] = ("campaign", "rules")

def _check_writable(session_root: Path, target: Path, path_arg: str) -> None:
    rel = target.relative_to(Path(session_root).resolve(strict=False))
    if rel.parts and rel.parts[0] in READ_ONLY_PREFIXES:
        raise ModelRetry(
            f"Path '{path_arg}' is in '{rel.parts[0]}/' which is read-only. ..."
        )
```

`write_file` and `edit_file` now call `_check_writable` after sandbox resolution. `read_file`, `glob_files`, and `bash` are unaffected (bash is intentionally not guarded — full unrestricted Bash is an explicit project decision; HARN-03). The ModelRetry message tells the agent which trees are writable (`world/`, `pc.json` at root) so it self-corrects on the next iteration.

7 new tests in `tests/test_tools.py` (total: 19): rejection cases (write to campaign, write to rules, edit campaign, edit rules — 4 tests), positive cases (campaign/rules still readable via `read_file` + `glob_files`; `world/` writable; `pc.json` at root writable — 3 tests).

**2. Low visibility into agent behavior each turn.** The bare `print(reply)` flow gave no indication of what the agent was doing — read which file? edit what? roll what? Replaced the inner loop with pydantic-ai's node iteration API:

```python
async for node in agent_run:
    if Agent.is_call_tools_node(node):
        for part in node.model_response.parts:
            if isinstance(part, ThinkingPart):    _render_thinking(part)
            elif isinstance(part, ToolCallPart):  _render_tool_call(part, session_root)
    elif Agent.is_model_request_node(node):
        for part in getattr(node.request, "parts", []) or []:
            if isinstance(part, ToolReturnPart):  _render_tool_return(part)
```

Renders each tool call inline (dim cyan `↪ tool_name` with truncated args + cwd-relative path that iTerm2 / VS Code / macOS Terminal auto-link), each tool return (dim with line count + indented body), and `ThinkingPart` content (dim italic `💭`). Final agent reply is post-rendered as Markdown via `rich.markdown.Markdown`. Player prompt uses `console.input("[bold yellow]You>[/] ")`.

Trade-off: Markdown narration is rendered as a single block at end-of-turn instead of streamed token-by-token. Tool-call visibility was the dominant friction during playtest — this trade-off was the right one.

**3. Placeholder `scene_01.md` insufficient for real play.** The seed campaign was a one-line stub. Replaced with the full Lost Mine of Phandelver published adventure under `template_world/campaign/`:

- `Introduction/` — Adventure_Hook, Background, Premade_Characters, Running_the_Adventure, The_Forgotten_Realms, Overview
- `Part1_Goblin_Arrows/` — Goblin_Ambush, Cragmaw_Hideout, Overview
- `Part2_Phandalin/` — Town_Description, Important_NPCs, Encounters_in_Phandalin, Redbrand_Ruffians, Redbrand_Hideout, Overview
- `Part3_The_Spiders_Web/` — Triboar_Trail, Conyberry_and_Agathas_Lair, Old_Owl_Well, Wyvern_Tor, Ruins_of_Thundertree, Cragmaw_Castle, Whats_Next, Overview
- `Part4_Wave_Echo_Cave/` — General_Features, Keyed_Encounters, Wandering_Monsters, Conclusion, Character_Level, Experience_Point_Awards, Overview
- `Appendix_A_Magic_Items/` — Item_Descriptions, Using_a_Magic_Item, Overview
- `Appendix_B_Monsters/` — Monster_Descriptions, Statistics, Overview

`campaign/index.md` rewritten as the campaign TOC (the file the agent reads first). `template_world/world/scene.json` updated to the LMoP starting scene. `template_world/README.md` updated to point at the new layout.

**System prompt (`agent.py`).** Updated to teach the read-only invariant: "Two top-level subtrees are READ-ONLY reference material — `campaign/` (published adventure, treat as canon) and `rules/` (game rules summary). Live, mutable state lives at `pc.json` and inside `world/`." Added `qwen3.6-27b` preset to `DEFAULT_MODEL_PRESETS`.

**Build config.** Added `rich>=13.0` to `pyproject.toml` and `[tool.hatch.build.targets.wheel] packages = ["."]` so hatch can build the wheel (the project IS the directory; without this, hatch refuses to find a package). Checked in `uv.lock`.

## Verification

```
$ cd backend_generalist && uv run pytest --tb=short -q
38 passed in 1.17s

$ uv run --project backend_generalist python -m backend_generalist --help
Usage: python -m backend_generalist [OPTIONS]
  Start a new generalist GM session.
Options:
  -m, --model TEXT     Model preset: qwen3.5 (default), qwen3.6-27b, deepseek,
                       glm-4.7, gemini-flash.
  --sessions-dir PATH  Parent directory for session world dirs. Default:
                       ./sessions/
  --help               Show this message and exit.
```

Test breakdown: `test_sandbox.py` (9) + `test_world.py` (6) + `test_tools.py` (19, of which 7 new for read-only enforcement) + `test_cli.py` (4) = 38.

## Human Checkpoint Verdict

**`play passed`** — the user played 7 sessions across multiple model presets and confirmed:

- **PLAY-01** (end-to-end slice without crashes/corruption): YES. Sessions completed cleanly; Ctrl-C exits preserved JSON state.
- **PLAY-02** (state continuity across turns): YES. Mid-session inspection of `pc.json` / `world/scene.json` / `world/encounter.json` reflected in-fiction state across turns.
- **PLAY-03** (coherent narration without a dedicated narration tool): YES. The agent's free-text reply IS the narration (no `narrate` / `apply_damage` / `create_enemy` / etc. exist anywhere in the codebase — verified by grep returning 0 across `cli.py`, `agent.py`, `tools.py`).

### Qualitative observations from playtest (the spike's actual deliverable)

These were the friction points observed and fixed in commit `ebb8b5f`:

1. **Agent tampering with canonical material.** Without explicit guard rails, the agent occasionally wrote to `campaign/` files instead of treating them as canon. Read-only enforcement at the tool layer + system-prompt teaching closes this.
2. **Tool-call invisibility.** Plain stdout gave no signal about what the agent did each turn, making it impossible to tell whether state edits were happening at all. Tool-call telemetry resolves this — and the visibility itself is now a debugging asset, not just UX.
3. **Toy seed insufficient for evaluation.** A one-scene placeholder doesn't exercise the harness against real adventure structure (factions, locations, NPCs, encounter tables). Loading a published adventure was the unblock.

### Verdict on the viability hypothesis

**The generalist-harness pattern is viable.** A pydantic-ai agent armed with EXACTLY 5 generic primitives (Read, Write, Edit, Glob, Bash) over a JSON world directory can run a coherent solo TTRPG slice end-to-end without any domain-specific tools. The agent learns the world layout via Read/Glob; mutates state via Write/Edit; rolls dice and runs `jq` via Bash. State persists across turns. Narration is coherent.

The friction points found are not pattern failures — they're **substrate failures** that any harness would face:
- Reference vs. mutable state needs a contract (solved by directory-prefix convention).
- Operator visibility into agent actions needs to be designed in, not assumed (solved by tool-call telemetry).
- Real evaluation needs real source material (solved by loading LMoP).

### Recommended next steps (carry forward)

- **v2 hardening (HARD-01):** Atomic JSON writes (`os.replace` for full Ctrl-C safety), session log persistence, agent-action quotas. Currently accepted as low-risk for v1.
- **System prompt iteration:** Some friction (agent re-reading the same files every turn, occasionally forgetting to write state) is system-prompt-shaped, not architecture-shaped. Worth a focused phase.
- **Decide:** Promote `backend_generalist/` to replace `backend/`, or keep it as a parallel substrate. The viability question is answered; the migration question is separate.

## Deviations

### Plan deviation 1 — Task 1 commit (already documented in `2d1251d`)

Three deviations were taken during Task 1 implementation, each documented in the commit message of `2d1251d`:

1. **Removed unused `from loguru import logger`.** loguru not installed in venv; never used in module. Rule 3 fix (drop unused imports).
2. **Added `from dotenv import load_dotenv; load_dotenv()`.** Plan 03's SUMMARY explicitly flagged this as Plan 04's concern. The plan body did not include it; it was required for the human playtest. Rule 2 fix (add what the plan missed).
3. **Rewrote `_FakeIter` test fixture.** Plan-prescribed code monkey-patched `__aiter__` onto a `MagicMock`, which collided with MagicMock's auto-self injection (`takes 1 positional argument but 2 were given`). Replaced with real `_FakeAgentRun` / `_FakeIterCtx` classes. Rule 1 fix (make tests work). Same 4 test intents preserved; same coverage.

### Plan deviation 2 — Post-playtest hardening (commit `ebb8b5f`)

The plan's Task 2 was a human-verify checkpoint with a `resume-signal` of `play passed/partial/failed/bug`. The user played, observed friction, and instead of replying with a `play partial` signal, iteratively fixed the friction. The fixes were genuinely scope-creep relative to the literal plan body, but coherent: each fix was a direct response to a documented friction point, and each was needed to honestly answer the viability question.

Material added beyond the plan:

- **Read-only subtree enforcement** in `tools.py` + 7 new tests in `test_tools.py`.
- **Rich-rendered tool-call telemetry** in `cli.py` (~96 net added lines).
- **Full LMoP campaign content** under `template_world/campaign/` (replaces the one-line stub).
- **System prompt update** to teach the new read-only invariant.
- **Build config** + `rich>=13.0` dep + `uv.lock`.
- **`qwen3.6-27b` model preset.**

This is documented as a deliberate scope expansion. The verdict (`play passed`) was reached after the fixes; the fixes were what made the viability question answerable.

### Environment notes (not deviations)

- The plan's verify command used a top-level `python -m backend_generalist`. The system has no `python` shim; verification was run via `uv run --project backend_generalist python -m backend_generalist --help` (and `cd backend_generalist && uv run pytest` for the test suite).
- The wheel build config (`[tool.hatch.build.targets.wheel] packages = ["."]`) was needed to make `uv sync` succeed against `backend_generalist/pyproject.toml` once `rich` was added — without it, hatch's auto-detection refuses to build because no package matches the project name. Standard workaround.

## Authentication Gates

- `build_agent()` requires `OPENROUTER_API_KEY` at construction time (OpenRouter provider's contract); satisfied by `load_dotenv()` at CLI import time. Tests do NOT construct an Agent — they mock `build_agent` to return a fake agent + settings tuple — so the test suite runs offline with no key set. Verified: 38/38 tests pass with `OPENROUTER_API_KEY` unset.

## Known Stubs

None. Every requirement claimed by this phase is satisfied by real code, real tests, or real human-witnessed play.

## Self-Check: PASSED

Verification performed after writing this SUMMARY:

- File `backend_generalist/cli.py`: FOUND
- File `backend_generalist/__main__.py`: FOUND
- File `backend_generalist/tests/test_cli.py`: FOUND
- File `backend_generalist/uv.lock`: FOUND (checked in)
- Commit `2d1251d` (Task 1): FOUND in `git log --oneline`
- Commit `ebb8b5f` (Task 2 hardening): FOUND in `git log --oneline`
- Test run (re-run before writing this section): `38 passed in 1.17s`
- `python -m backend_generalist --help`: exits 0, prints usage
- `grep -cE "^def (read_file|write_file|edit_file|glob_files|bash)\(" backend_generalist/tools.py`: `5`
- `grep -cE "(narrate|apply_damage|create_enemy|roll_dice|ask_player_roll|award_xp|add_to_inventory|update_character_state|create_countdown|update_countdown|set_boss_battle|apply_condition|remove_condition|load_campaign_section|unload_campaign_section)" backend_generalist/cli.py backend_generalist/agent.py backend_generalist/tools.py`: `0`, `0`, `0`
- 7 sessions present in `sessions/` (gitignored), each containing `pc.json`, `campaign/`, `world/`, `rules/`, `README.md`
- Human checkpoint verdict captured: `play passed`
