"""Tests for the sandbox primitive (HARN-02 / HARN-03).

Every generic tool wrapper (Read, Write, Edit, Glob, Bash) routes through
`resolve_in_sandbox` / `run_bash_in_sandbox`. These tests pin the security
floor: path-traversal escapes are rejected, non-existent targets are allowed
(Write needs that), and Bash runs with cwd locked to the session root.
"""
from __future__ import annotations

import os
import subprocess
from pathlib import Path

import pytest

from backend_generalist.sandbox import (
    SandboxEscapeError,
    resolve_in_sandbox,
    run_bash_in_sandbox,
)


def test_resolve_happy_path(tmp_path: Path) -> None:
    """Plain relative path inside the root resolves to root/<name>."""
    target = tmp_path / "pc.json"
    target.write_text("{}")

    resolved = resolve_in_sandbox(tmp_path, "pc.json")

    assert resolved == (tmp_path / "pc.json").resolve()
    assert resolved.is_absolute()


def test_resolve_nested_happy_path(tmp_path: Path) -> None:
    """Nested relative path inside the root resolves under the root."""
    nested_dir = tmp_path / "world"
    nested_dir.mkdir()
    (nested_dir / "scene.json").write_text("{}")

    resolved = resolve_in_sandbox(tmp_path, "world/scene.json")

    assert resolved == (tmp_path / "world" / "scene.json").resolve()
    # Containment: the resolved root must be an ancestor.
    assert tmp_path.resolve() in resolved.parents


def test_resolve_rejects_dotdot_escape(tmp_path: Path) -> None:
    """`../../etc/passwd` must escape and raise."""
    with pytest.raises(SandboxEscapeError):
        resolve_in_sandbox(tmp_path, "../../etc/passwd")


def test_resolve_rejects_absolute_escape(tmp_path: Path) -> None:
    """Absolute path outside the root must raise."""
    with pytest.raises(SandboxEscapeError):
        resolve_in_sandbox(tmp_path, "/etc/passwd")


def test_resolve_rejects_symlink_escape(tmp_path: Path) -> None:
    """Symlink whose target is outside the root must be rejected after resolution."""
    link = tmp_path / "link"
    os.symlink("/tmp", link)

    with pytest.raises(SandboxEscapeError):
        resolve_in_sandbox(tmp_path, "link/foo")


def test_resolve_allows_nonexistent_target(tmp_path: Path) -> None:
    """Write needs to be allowed to target a path that does not exist yet."""
    resolved = resolve_in_sandbox(tmp_path, "new_file.json")

    assert resolved == (tmp_path / "new_file.json").resolve()
    assert not resolved.exists()


def test_bash_cwd_confinement(tmp_path: Path) -> None:
    """`pwd` must report the resolved session root as cwd."""
    result = run_bash_in_sandbox(tmp_path, "pwd")

    assert result.stdout.strip() == str(tmp_path.resolve())


def test_bash_captures_stdout_and_stderr(tmp_path: Path) -> None:
    """Both stdout and stderr must be captured as text."""
    result = run_bash_in_sandbox(tmp_path, "echo hi; echo err 1>&2")

    assert "hi" in result.stdout
    assert "err" in result.stderr


def test_bash_timeout_propagates(tmp_path: Path) -> None:
    """`sleep 5` with timeout=0.1 must raise subprocess.TimeoutExpired."""
    with pytest.raises(subprocess.TimeoutExpired):
        run_bash_in_sandbox(tmp_path, "sleep 5", timeout=0.1)
