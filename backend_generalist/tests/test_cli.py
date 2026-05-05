"""Offline CLI smoke tests — no real LLM call.

These tests verify wiring (the CLI bootstraps a world dir, prints the session ID +
path, and would call agent.iter — we mock the agent to avoid a network call).
Real end-to-end play is verified by the human-in-the-loop checkpoint task.
"""
from __future__ import annotations
import asyncio
import json
from pathlib import Path
from unittest.mock import MagicMock

import pytest
from pydantic_ai.messages import ToolCallPart

from backend_generalist import cli as cli_mod


# --------------------------------------------------------------------------- #
# Fake agent_run / agent.iter() shims
#
# We need an object that:
#   - is usable as `async with agent.iter(...) as agent_run:`
#   - is an empty async-iterable inside that context (so `async for _ in agent_run`
#     completes without yielding anything)
#   - exposes `.result.output` (str) and `.result.all_messages()` (list)
#
# A real class beats a MagicMock here: pure-MagicMock async iteration is fragile
# (the auto-self injection collides with bound async-generator methods).
# --------------------------------------------------------------------------- #


class _FakeAgentRun:
    """Empty async-iterable holding a fake result."""

    def __init__(self, output: str, messages: list | None = None) -> None:
        self.result = MagicMock()
        self.result.output = output
        self.result.all_messages = MagicMock(return_value=messages or [])

    def __aiter__(self):
        return self

    async def __anext__(self):
        raise StopAsyncIteration


class _FakeIterCtx:
    """Async context manager that yields a `_FakeAgentRun` on enter."""

    def __init__(self, run: _FakeAgentRun) -> None:
        self._run = run

    async def __aenter__(self) -> _FakeAgentRun:
        return self._run

    async def __aexit__(self, *exc) -> bool:
        return False


def _install_fake_agent(
    monkeypatch, output: str = "Opening narration."
) -> dict[str, object]:
    """Patch cli_mod.build_agent to return a fake agent whose .iter is offline."""

    def _make_iter(*args, **kwargs):
        return _FakeIterCtx(_FakeAgentRun(output))

    fake_agent = MagicMock()
    fake_agent.iter = _make_iter
    captured: dict[str, object] = {}

    def _build_agent(model_id=None):
        captured["model_id"] = model_id
        return fake_agent, MagicMock()

    monkeypatch.setattr(
        cli_mod,
        "build_agent",
        _build_agent,
    )
    return captured


# --------------------------------------------------------------------------- #
# Tests
# --------------------------------------------------------------------------- #


def test_cli_main_help_exits_zero():
    """`python -m backend_generalist --help` exits with code 0 (Click standard)."""
    from click.testing import CliRunner
    runner = CliRunner()
    result = runner.invoke(cli_mod.main, ["--help"])
    assert result.exit_code == 0
    assert "session" in result.output.lower() or "Start" in result.output


def test_run_chat_bootstraps_session_dir(tmp_path, monkeypatch, capsys):
    """run_chat() creates a session dir, prints the ID + absolute path, then exits on EOF."""

    _install_fake_agent(monkeypatch, output="The trail bends quietly. What do you do?")

    # Pipe stdin: after the opening turn, send EOF to terminate the loop.
    def _eof(*a, **k):
        raise EOFError()
    monkeypatch.setattr("builtins.input", _eof)

    asyncio.run(
        cli_mod.run_chat(
            model_id=None,
            sessions_dir_override=str(tmp_path / "sessions"),
        )
    )

    captured = capsys.readouterr()
    assert "[session] id=" in captured.out
    assert "[session] world=" in captured.out

    # Find the actual session dir created
    sessions = list((tmp_path / "sessions").iterdir())
    assert len(sessions) == 1
    session_dir = sessions[0]
    assert (session_dir / "pc.json").is_file()
    # JSON is valid (proves world template was copied intact)
    json.loads((session_dir / "pc.json").read_text())


def test_run_chat_forwards_raw_openrouter_model_id(tmp_path, monkeypatch, capsys):
    """run_chat() passes the CLI model value through as a raw OpenRouter model ID."""

    captured = _install_fake_agent(monkeypatch, output="The trail waits.")

    def _eof(*a, **k):
        raise EOFError()

    monkeypatch.setattr("builtins.input", _eof)

    asyncio.run(
        cli_mod.run_chat(
            model_id="moonshotai/kimi-k2.6",
            sessions_dir_override=str(tmp_path / "sessions"),
        )
    )

    capsys.readouterr()
    assert captured["model_id"] == "moonshotai/kimi-k2.6"


def test_run_chat_accepts_template_dir_override(tmp_path, monkeypatch, capsys):
    """run_chat() can bootstrap from a caller-selected world template."""

    _install_fake_agent(monkeypatch, output="The gallery waits.")

    template = tmp_path / "social_template"
    (template / "campaign").mkdir(parents=True)
    (template / "world").mkdir()
    (template / "rules").mkdir()
    (template / "rules" / "spell_list").mkdir()
    (template / "rules" / "class_abilities").mkdir()
    (template / "README.md").write_text("Social template\n", encoding="utf-8")
    (template / "campaign" / "index.md").write_text("# Social\n", encoding="utf-8")
    (template / "world" / "scene.json").write_text(
        '{"location": "gallery"}\n', encoding="utf-8"
    )
    (template / "world" / "encounter.json").write_text(
        '{"active": false, "mode": "social"}\n', encoding="utf-8"
    )
    (template / "world" / "npcs.json").write_text(
        '{"jun": {"attitude_to_pc": "neutral"}}\n', encoding="utf-8"
    )
    (template / "rules" / "core-ruleset.md").write_text(
        "# Core Rules\n", encoding="utf-8"
    )
    (template / "rules" / "spell_list" / "INDEX.md").write_text(
        "# Spell Lists\n", encoding="utf-8"
    )
    (template / "rules" / "spell_list" / "mage.md").write_text(
        "# Mage Spell List\n", encoding="utf-8"
    )
    (template / "rules" / "class_abilities" / "INDEX.md").write_text(
        "# Class Abilities\n", encoding="utf-8"
    )
    (template / "rules" / "class_abilities" / "warrior.md").write_text(
        "# Warrior Class Abilities\n", encoding="utf-8"
    )
    (template / "pc.json").write_text(
        '{"name": "Mara Vey", "stress": 0}\n', encoding="utf-8"
    )

    def _eof(*a, **k):
        raise EOFError()

    monkeypatch.setattr("builtins.input", _eof)

    asyncio.run(
        cli_mod.run_chat(
            model_id=None,
            sessions_dir_override=str(tmp_path / "sessions"),
            template_dir_override=str(template),
        )
    )

    captured = capsys.readouterr()
    assert "[session] world=" in captured.out

    sessions = list((tmp_path / "sessions").iterdir())
    assert len(sessions) == 1
    session_dir = sessions[0]
    pc = json.loads((session_dir / "pc.json").read_text())
    assert pc["name"] == "Mara Vey"
    assert (session_dir / "world" / "npcs.json").is_file()


def test_run_chat_preserves_state_on_keyboard_interrupt(tmp_path, monkeypatch, capsys):
    """Ctrl-C during the loop does not corrupt session files."""

    _install_fake_agent(monkeypatch, output="Opening narration.")

    # First input call: raise KeyboardInterrupt to simulate Ctrl-C
    def _kbd(*a, **k):
        raise KeyboardInterrupt()
    monkeypatch.setattr("builtins.input", _kbd)

    asyncio.run(
        cli_mod.run_chat(
            model_id=None,
            sessions_dir_override=str(tmp_path / "sessions"),
        )
    )

    captured = capsys.readouterr()
    assert (
        "interrupted" in captured.out.lower()
        or "world dir" in captured.out.lower()
    )

    # State files survive intact (JSON is parseable)
    sessions = list((tmp_path / "sessions").iterdir())
    assert len(sessions) == 1
    pc = json.loads((sessions[0] / "pc.json").read_text())
    assert "name" in pc
    scene = json.loads((sessions[0] / "world" / "scene.json").read_text())
    assert "location" in scene


def test_player_narration_renderer_shows_gm_output(capsys) -> None:
    """GM output is rendered as the player-visible GM channel."""

    cli_mod._render_player_narration("The corridor is dark and quiet.")
    rendered = capsys.readouterr().out

    assert "GM>" in rendered
    assert "The corridor is dark and quiet." in rendered


def test_gm_output_renderer_shows_final_text(capsys) -> None:
    """The CLI shows final model output to the player."""

    cli_mod._render_gm_output("This should appear as the GM response.")
    rendered = capsys.readouterr().out

    assert "GM>" in rendered
    assert "This should appear" in rendered


def test_tool_call_renderer_shows_think_notes(tmp_path, capsys) -> None:
    """Dev telemetry prints concise think tool calls."""

    part = ToolCallPart(
        tool_name="think",
        args={"thought": "Need to reconcile the roll before editing state."},
    )
    cli_mod._render_tool_call(part, tmp_path)
    rendered = capsys.readouterr().out

    assert "think" in rendered
    assert "reconcile the roll" in rendered


def test_gm_output_renderer_does_not_truncate_payload(capsys) -> None:
    """Player-visible GM output can show the whole final return string."""

    long_update = "x" * 300
    cli_mod._render_gm_output(f"Read pc.json; state delta: {long_update}")
    rendered = capsys.readouterr().out

    assert long_update in rendered.replace("\n", "")
    assert "…" not in rendered


def test_module_main_invokes_cli():
    """`python -m backend_generalist` resolves to the CLI main."""
    import backend_generalist.__main__ as mm
    from backend_generalist.cli import main as cli_main
    assert mm.main is cli_main
