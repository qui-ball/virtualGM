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


def _install_fake_agent(monkeypatch, output: str = "Opening narration.") -> None:
    """Patch cli_mod.build_agent to return a fake agent whose .iter is offline."""

    def _make_iter(*args, **kwargs):
        return _FakeIterCtx(_FakeAgentRun(output))

    fake_agent = MagicMock()
    fake_agent.iter = _make_iter

    monkeypatch.setattr(
        cli_mod,
        "build_agent",
        lambda model_preset=None: (fake_agent, MagicMock()),
    )


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
            model_preset=None,
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


def test_run_chat_preserves_state_on_keyboard_interrupt(tmp_path, monkeypatch, capsys):
    """Ctrl-C during the loop does not corrupt session files."""

    _install_fake_agent(monkeypatch, output="Opening narration.")

    # First input call: raise KeyboardInterrupt to simulate Ctrl-C
    def _kbd(*a, **k):
        raise KeyboardInterrupt()
    monkeypatch.setattr("builtins.input", _kbd)

    asyncio.run(
        cli_mod.run_chat(
            model_preset=None,
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


def test_module_main_invokes_cli():
    """`python -m backend_generalist` resolves to the CLI main."""
    import backend_generalist.__main__ as mm
    from backend_generalist.cli import main as cli_main
    assert mm.main is cli_main
