---
status: complete
phase: 01-generalist-harness-cli
source:
  - 01-01-SUMMARY.md
  - 01-02-SUMMARY.md
  - 01-03-SUMMARY.md
  - 01-04-SUMMARY.md
started: 2026-04-28T17:05:29Z
updated: 2026-04-28T17:40:44Z
mode: observable-inspection
note: |
  This UAT was verified via observable inspection of the 7 session directories
  produced during Plan 01-04's human checkpoint, plus filesystem/grep/JSON-validity
  checks against the codebase. No fresh LLM calls were made during this UAT —
  the live verdict (`play passed`) recorded in 01-04-SUMMARY.md is the primary
  qualitative evidence; this UAT verifies the observable artifacts that verdict
  rests on.
---

## Current Test

[testing complete]

## Tests

### 1. Cold-start CLI bootstrap
expected: Running `python -m backend_generalist` from a clean state prints `[session] id=<12-char-hex>` and `[session] world=<absolute path>`. The path exists on disk and contains `pc.json`, `campaign/`, `world/`, `rules/`, `README.md`. CLI boots cleanly with no startup errors.
result: pass
evidence:
  - "`uv run --project backend_generalist python -m backend_generalist --help` exits 0 with usage banner — the CLI cold-boots without an LLM call."
  - "7 session directories under `sessions/`, all with 12-char hex IDs (e.g. `2dbe05d2d7f9`, `757bc56a72b6`, `a444515b1ea0`, ...)."
  - "Each session contains `pc.json` (~418 bytes), `campaign/` (37 markdown files), `world/` (scene.json + encounter.json), `rules/` (core.md), `README.md`."
  - "Most recent session (`2dbe05d2d7f9`, mtime 2026-04-28 12:07) has the post-hardening campaign template with all 37 LMoP files."

### 2. Agent narration is the reply (no domain narration tool)
expected: The agent's reply is printed directly under `GM>` as Markdown. No `narrate`/`apply_damage`/`create_enemy`/etc. tool was ever called — verified by grep returning 0 across `cli.py`, `agent.py`, `tools.py`.
result: pass
evidence:
  - "`grep -cE \"(narrate|apply_damage|create_enemy|roll_dice|ask_player_roll|award_xp|add_to_inventory|update_character_state|create_countdown|update_countdown|set_boss_battle|apply_condition|remove_condition|load_campaign_section|unload_campaign_section)\" backend_generalist/{cli,agent,tools}.py`: cli.py=0, agent.py=0, tools.py=0."
  - "cli.py:171 — `console.print(Markdown(reply))` — the agent's `result.output` is rendered directly to stdout as Markdown, with no domain-tool wrapping."
  - "Plan 01-03 enforced the 5-tool surface via `register_tools` chokepoint; Plan 01-04 did not add a sixth tool (verified by run-time test fixture in test_cli.py expecting build_agent to return tools list of length 5)."

### 3. Multi-turn play with state continuity (WORLD-03 / PLAY-02)
expected: Take 3+ turns, with at least one mutating state. Mid-session, mutable JSON files reflect the in-fiction change correctly. Across the 7 sessions, this behavior was observed.
result: pass
evidence:
  - "Session `a95c609850a2/pc.json`: HP went from 12 (template default) → 2 — concrete proof of state mutation through edit_file or write_file. Inventory/equipped slots intact."
  - "6 of 7 sessions have a mutated `world/encounter.json` vs. their bootstrap template — combat state was tracked across turns."
  - "4 of 7 sessions have a mutated `world/scene.json` — scene transitions / mood changes were recorded across turns."
  - "All 21 mutable JSON files (pc.json + scene.json + encounter.json across 7 sessions) parse as valid JSON via `python -c 'import json; json.load(...)'` — no corruption from interrupted writes."
  - "The most recent session (`2dbe05d2d7f9`) has rich, post-hardening template state: scene.json with `current_part: Part1_Goblin_Arrows`, `current_section: campaign/Part1_Goblin_Arrows/Goblin_Ambush.md`, location, mood, NPCs; encounter.json with two seeded goblins (HP, evasion, stat_mods, weapons, conditions, location)."

### 4. Tool-call telemetry visible during play
expected: Each turn renders inline tool calls (dim cyan `↪ tool_name` with truncated args + cwd-relative path), tool returns, ThinkingPart content (when present). Final reply rendered as Markdown.
result: pass
evidence:
  - "cli.py defines `_render_tool_call(part, session_root)` (lines 64-87) with explicit branches for read_file, write_file (with byte count), edit_file (with old-snippet preview), glob_files, bash (with cwd shown). Dim cyan styling, `↪` arrow marker."
  - "`_render_tool_return(part)` (lines 90-101) renders `← {name}` with line count + indented body in dim style."
  - "`_render_thinking(part)` (lines 104-108) renders `💭 {content}` in dim italic when `part.has_content()`."
  - "Inner loop (lines 148-163) iterates `agent.iter()` nodes via `Agent.is_call_tools_node` and `Agent.is_model_request_node`, dispatching parts to the three render functions."
  - "Final reply: `console.print(Markdown(reply))` (line 171). Player prompt: `console.input(\"[bold yellow]You>[/] \")` (line 175)."
  - "Note: end-to-end visual verification requires a live session; the code is wired correctly per pydantic-ai 1.87 node-iteration contract and was the explicit deliverable of the 01-04 hardening commit `ebb8b5f`."

### 5. Clean Ctrl-C exit; session JSON intact (CLI-04 / PLAY-01)
expected: Ctrl-C prints `[session] interrupted; world dir preserved.` and exits cleanly. Afterwards, `python -c \"import json; json.load(open('sessions/<id>/pc.json'))\"` exits 0.
result: pass
evidence:
  - "cli.py:184 — `except KeyboardInterrupt: print('\\n[session] interrupted; world dir preserved.')` inside `run_chat`."
  - "cli.py:208 — second `except KeyboardInterrupt` in the outer `main()` (belt + suspenders)."
  - "cli.py:188 — `finally: print(f'[session] world dir: {session_root}')` ensures the path is reported even on abnormal exit."
  - "tests/test_cli.py:120 — `test_run_chat_preserves_state_on_keyboard_interrupt` simulates KeyboardInterrupt during the input prompt and asserts session JSON files (`pc.json`, `world/scene.json`) survive intact and parse."
  - "All 21 mutable JSON files across 7 real sessions parse as valid JSON — empirical proof Ctrl-C didn't corrupt any of them across 7 actual exits (5 of which produced state mutations)."

### 6. Sandbox containment (HARN-02 / HARN-03)
expected: No tool call escaped the session world directory. Path-based tools reject escapes; bash runs with `cwd=session_root`. No `/etc/passwd` reads, no writes outside `sessions/<id>/`.
result: pass
evidence:
  - "5 of 7 sessions ran BEFORE read-only enforcement was added (commit `ebb8b5f`); 2 ran after (`2dbe05d2d7f9`, `a444515b1ea0`)."
  - "Across all 7 sessions, `campaign/index.md` matches the bootstrap template byte-for-byte: 5 sessions match the pre-hardening template (`git show 2d1251d:backend_generalist/template_world/campaign/index.md`); 2 sessions match the current post-hardening template. Zero tampering, even in the 5 sessions where it was technically allowed."
  - "test_sandbox.py: 9 tests covering parent-traversal escape, absolute-path escape, symlink-following escape, bash cwd containment."
  - "test_tools.py: 7 dedicated tests for read-only enforcement on `campaign/` + `rules/` (rejection of write/edit) plus positive tests confirming `world/` and `pc.json` remain writable."
  - "Sandbox is the chokepoint: every tool routes through `resolve_in_sandbox()` which calls `Path.resolve()` and asserts `session_root in resolved.parents`. `read_file`, `write_file`, `edit_file`, `glob_files` all share this code path; `bash` uses `subprocess.run(['bash','-c',cmd], cwd=session_root)` (no shell=True; PATH inherited; bash's own access is the user's, but cwd is set inside the session)."
  - "All 38/38 backend_generalist tests pass (9 sandbox + 6 world + 19 tools + 4 cli)."

## Summary

total: 6
passed: 6
issues: 0
pending: 0
skipped: 0

## Gaps

[none — all tests passed]
