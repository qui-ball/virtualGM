"""Tool-level tests for backend_generalist.tools.

12 tests pinning the contract for the 5 generic tools (read_file, write_file,
edit_file, glob_files, bash). Every tool routes through the sandbox primitives
from Plan 01-01; these tests prove the routing happens and that escapes are
rejected with ModelRetry rather than silently servicing the request.

The tests do NOT exercise pydantic-ai's RunContext directly — that type is
internal and version-coupled. Instead each tool function only reads
``ctx.deps.session_root``, so a ``types.SimpleNamespace(deps=...)`` shim is
sufficient and isolates these tests from pydantic-ai upgrades.
"""
from __future__ import annotations

from dataclasses import dataclass
from pathlib import Path
from types import SimpleNamespace

import pytest
from pydantic_ai import ModelRetry

from backend_generalist.tools import (
    bash,
    edit_file,
    glob_files,
    read_file,
    write_file,
)


# --------------------------------------------------------------------------- #
# Shim — minimal RunContext stand-in carrying just what the tools read.
# --------------------------------------------------------------------------- #


@dataclass
class _Deps:
    session_root: Path


def make_ctx(tmp_path: Path) -> SimpleNamespace:
    """Build a minimal session world and a RunContext-like ctx pointing at it."""
    (tmp_path / "world").mkdir()
    (tmp_path / "pc.json").write_text(
        '{"hp": 12, "name": "Aldric"}', encoding="utf-8"
    )
    (tmp_path / "world" / "scene.json").write_text(
        '{"location": "trail"}', encoding="utf-8"
    )
    (tmp_path / "world" / "encounter.json").write_text(
        '{"active": false}', encoding="utf-8"
    )
    return SimpleNamespace(deps=_Deps(session_root=tmp_path))


# --------------------------------------------------------------------------- #
# read_file — happy + escape
# --------------------------------------------------------------------------- #


def test_read_file_happy_path(tmp_path: Path) -> None:
    ctx = make_ctx(tmp_path)
    content = read_file(ctx, "pc.json")
    assert content == '{"hp": 12, "name": "Aldric"}'


def test_read_file_rejects_dotdot_escape(tmp_path: Path) -> None:
    ctx = make_ctx(tmp_path)
    with pytest.raises(ModelRetry):
        read_file(ctx, "../../etc/passwd")


# --------------------------------------------------------------------------- #
# write_file — happy + creates parents + escape
# --------------------------------------------------------------------------- #


def test_write_file_happy_path(tmp_path: Path) -> None:
    ctx = make_ctx(tmp_path)
    write_file(ctx, "world/new.json", "{}")
    assert (tmp_path / "world" / "new.json").read_text(encoding="utf-8") == "{}"


def test_write_file_creates_parent_dirs(tmp_path: Path) -> None:
    ctx = make_ctx(tmp_path)
    write_file(ctx, "deep/nested/file.txt", "hi")
    target = tmp_path / "deep" / "nested" / "file.txt"
    assert target.is_file()
    assert target.read_text(encoding="utf-8") == "hi"


def test_write_file_rejects_absolute_escape(tmp_path: Path) -> None:
    ctx = make_ctx(tmp_path)
    evil = Path("/tmp/_gsd_evil_should_never_exist.txt")
    if evil.exists():
        evil.unlink()
    with pytest.raises(ModelRetry):
        write_file(ctx, str(evil), "x")
    assert not evil.exists(), "write_file leaked outside session root"


# --------------------------------------------------------------------------- #
# edit_file — happy + no-match retry
# --------------------------------------------------------------------------- #


def test_edit_file_happy_path(tmp_path: Path) -> None:
    ctx = make_ctx(tmp_path)
    edit_file(ctx, "pc.json", '"hp": 12', '"hp": 8')
    assert (tmp_path / "pc.json").read_text(encoding="utf-8") == (
        '{"hp": 8, "name": "Aldric"}'
    )


def test_edit_file_no_match_raises_model_retry(tmp_path: Path) -> None:
    ctx = make_ctx(tmp_path)
    with pytest.raises(ModelRetry):
        edit_file(ctx, "pc.json", "NONEXISTENT", "X")


# --------------------------------------------------------------------------- #
# glob_files — happy + escape
# --------------------------------------------------------------------------- #


def test_glob_files_happy_path(tmp_path: Path) -> None:
    ctx = make_ctx(tmp_path)
    result = glob_files(ctx, "**/*.json")
    assert "pc.json" in result
    # scene.json + encounter.json are under world/; check the path appears
    assert "scene.json" in result
    assert "encounter.json" in result


def test_glob_files_rejects_escape(tmp_path: Path) -> None:
    ctx = make_ctx(tmp_path)
    with pytest.raises(ModelRetry):
        glob_files(ctx, "../**/*")


# --------------------------------------------------------------------------- #
# bash — happy + stderr capture + truncation
# --------------------------------------------------------------------------- #


def test_bash_happy_path(tmp_path: Path) -> None:
    ctx = make_ctx(tmp_path)
    out = bash(ctx, "ls")
    # ls of session root should list pc.json (and the world dir)
    assert "pc.json" in out


def test_bash_captures_stderr(tmp_path: Path) -> None:
    ctx = make_ctx(tmp_path)
    out = bash(ctx, "echo err 1>&2")
    assert "err" in out


def test_bash_truncates_huge_output(tmp_path: Path) -> None:
    ctx = make_ctx(tmp_path)
    # `yes hello | head -c 100000` reliably emits ~100k bytes.
    out = bash(ctx, "yes hello | head -c 100000")
    # Output should be bounded — well under the raw 100k input.
    assert len(out) <= 33_000, f"output not truncated: {len(out)} chars"
    assert out.rstrip().endswith("[truncated]"), (
        f"truncation marker missing; tail was: {out[-200:]!r}"
    )


# --------------------------------------------------------------------------- #
# Read-only subtree enforcement — campaign/ and rules/ are reference material
# --------------------------------------------------------------------------- #


def _ctx_with_readonly_dirs(tmp_path: Path) -> SimpleNamespace:
    """Extend make_ctx with seeded campaign/ and rules/ trees."""
    ctx = make_ctx(tmp_path)
    (tmp_path / "campaign").mkdir()
    (tmp_path / "campaign" / "index.md").write_text("# Campaign\n", encoding="utf-8")
    (tmp_path / "rules").mkdir()
    (tmp_path / "rules" / "core.md").write_text(
        "# Core Rules\nd20 + mod vs DC.\n", encoding="utf-8"
    )
    return ctx


def test_write_file_rejects_campaign_subtree(tmp_path: Path) -> None:
    ctx = _ctx_with_readonly_dirs(tmp_path)
    with pytest.raises(ModelRetry, match="read-only"):
        write_file(ctx, "campaign/index.md", "tampered")
    # Original content preserved.
    assert (tmp_path / "campaign" / "index.md").read_text() == "# Campaign\n"


def test_write_file_rejects_rules_subtree(tmp_path: Path) -> None:
    ctx = _ctx_with_readonly_dirs(tmp_path)
    with pytest.raises(ModelRetry, match="read-only"):
        write_file(ctx, "rules/core.md", "different rules")
    assert (tmp_path / "rules" / "core.md").read_text().startswith("# Core Rules")


def test_edit_file_rejects_campaign_subtree(tmp_path: Path) -> None:
    ctx = _ctx_with_readonly_dirs(tmp_path)
    with pytest.raises(ModelRetry, match="read-only"):
        edit_file(ctx, "campaign/index.md", "Campaign", "Tampered")
    assert (tmp_path / "campaign" / "index.md").read_text() == "# Campaign\n"


def test_edit_file_rejects_rules_subtree(tmp_path: Path) -> None:
    ctx = _ctx_with_readonly_dirs(tmp_path)
    with pytest.raises(ModelRetry, match="read-only"):
        edit_file(ctx, "rules/core.md", "d20", "d100")
    assert "d20" in (tmp_path / "rules" / "core.md").read_text()


def test_read_only_subtrees_still_readable(tmp_path: Path) -> None:
    """Read-only enforcement applies to write/edit only, NOT to read_file/glob/bash."""
    ctx = _ctx_with_readonly_dirs(tmp_path)
    # read_file should succeed.
    content = read_file(ctx, "campaign/index.md")
    assert content == "# Campaign\n"
    # glob_files should list them.
    matches = glob_files(ctx, "**/*.md")
    assert "campaign/index.md" in matches
    assert "rules/core.md" in matches


def test_world_subtree_is_writable(tmp_path: Path) -> None:
    """Sanity: writes outside the read-only trees still work."""
    ctx = _ctx_with_readonly_dirs(tmp_path)
    out = write_file(ctx, "world/scene.json", '{"location": "cave"}')
    assert "Wrote" in out
    assert (tmp_path / "world" / "scene.json").read_text() == '{"location": "cave"}'


def test_pc_json_at_root_is_writable(tmp_path: Path) -> None:
    """Sanity: pc.json at the session root remains writable."""
    ctx = _ctx_with_readonly_dirs(tmp_path)
    out = edit_file(ctx, "pc.json", '"hp": 12', '"hp": 8')
    assert "Edited" in out
    assert '"hp": 8' in (tmp_path / "pc.json").read_text()
