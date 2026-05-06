"""Generic GM harness tools — Read, Write, Edit, Bash.

EXACTLY these four tools are registered on the agent. There are NO domain
tools — no per-mechanic helpers, no specialized state wrappers. The tools
provide generic filesystem and shell access. The game state is JSON files
inside the per-session world directory.

Every filesystem path argument routes through ``resolve_in_sandbox`` (Plan
01-01) before touching disk. The Bash tool delegates to
``run_bash_in_sandbox``. The session_root is read from ``ctx.deps.session_root``;
nothing else is read off the RunContext.
"""
from __future__ import annotations

from pathlib import Path

from pydantic_ai import ModelRetry, RunContext

from backend_generalist.sandbox import (
    SandboxEscapeError,
    resolve_in_sandbox,
    run_bash_in_sandbox,
)

# Cap on bash output size so a `yes` flood can't blow the model's context.
MAX_BASH_OUTPUT_CHARS = 32_000

# Top-level subdirectories that are reference material — readable but not
# writable. The campaign tree (Lost Mine of Phandelver) and the rules summary
# define the world; the GM consumes them, never mutates them. Live state
# lives outside these (pc.json at the root, world/scene.json,
# world/encounter.json). Enforced by write_file and edit_file via
# ModelRetry so the agent gets a clear redirect when it tries.
#
# Bash is intentionally NOT guarded — full unrestricted Bash is an explicit
# project decision (HARN-03 / CLAUDE.md). The agent can technically still
# overwrite via `bash` if it tries, but that escape is visible in the tool
# call log and accepted as a known risk.
READ_ONLY_PREFIXES: tuple[str, ...] = ("campaign", "rules")


def _check_writable(session_root: Path, target: Path, path_arg: str) -> None:
    """Reject writes/edits that target a read-only top-level subtree.

    ``target`` must already be the sandbox-resolved absolute Path. Compares
    the resolved relative-from-session-root first segment against
    ``READ_ONLY_PREFIXES``.
    """
    try:
        rel = target.relative_to(Path(session_root).resolve(strict=False))
    except ValueError:
        # Defensive: the sandbox should have already rejected anything outside
        # the root, so this branch is unreachable in normal flow. Fall through
        # silently — the sandbox layer is the authoritative containment check.
        return
    parts = rel.parts
    if parts and parts[0] in READ_ONLY_PREFIXES:
        raise ModelRetry(
            f"Path '{path_arg}' is in '{parts[0]}/' which is read-only. "
            f"Read-only trees: {', '.join(READ_ONLY_PREFIXES)}. "
            f"Edit only files under 'world/' (scene.json, encounter.json) and "
            f"'pc.json' at the session root. The campaign and rules trees are "
            f"reference material — read freely, but do not modify."
        )


def read_file(ctx: RunContext, path: str) -> str:
    """Read a UTF-8 text file from inside the session world directory.

    Args:
        path: Relative path inside the session world directory. Absolute or
            ``..``-traversing paths are rejected via ModelRetry.

    Returns:
        The file's text content (UTF-8 decoded).
    """
    try:
        target = resolve_in_sandbox(ctx.deps.session_root, path)
    except SandboxEscapeError as e:
        raise ModelRetry(
            f"Path '{path}' escapes the session world directory: {e}"
        )
    if not target.is_file():
        raise ModelRetry(f"File not found: {path}")
    return target.read_text(encoding="utf-8")


def write_file(ctx: RunContext, path: str, content: str) -> str:
    """Write ``content`` to a file inside the session world directory.

    Creates any missing parent directories. Overwrites existing content.

    Args:
        path: Relative path inside the session world directory.
        content: Text content to write.

    Returns:
        Confirmation string with byte count.
    """
    try:
        target = resolve_in_sandbox(ctx.deps.session_root, path)
    except SandboxEscapeError as e:
        raise ModelRetry(
            f"Path '{path}' escapes the session world directory: {e}"
        )
    _check_writable(ctx.deps.session_root, target, path)
    target.parent.mkdir(parents=True, exist_ok=True)
    target.write_text(content, encoding="utf-8")
    return f"Wrote {len(content)} bytes to {path}"


def edit_file(ctx: RunContext, path: str, old: str, new: str) -> str:
    """Replace exactly one occurrence of ``old`` with ``new`` in ``path``.

    Raises ModelRetry if ``old`` is not present or appears more than once;
    the agent should retry with more surrounding context.

    Args:
        path: Relative path inside the session world directory.
        old: Snippet to replace (must match exactly once).
        new: Replacement text.

    Returns:
        Confirmation string.
    """
    try:
        target = resolve_in_sandbox(ctx.deps.session_root, path)
    except SandboxEscapeError as e:
        raise ModelRetry(
            f"Path '{path}' escapes the session world directory: {e}"
        )
    _check_writable(ctx.deps.session_root, target, path)
    if not target.is_file():
        raise ModelRetry(f"File not found: {path}")
    text = target.read_text(encoding="utf-8")
    count = text.count(old)
    if count == 0:
        raise ModelRetry(f"Pattern not found in {path}: {old!r}")
    if count > 1:
        raise ModelRetry(
            f"Pattern occurs {count} times in {path}; "
            "provide more unique surrounding context."
        )
    target.write_text(text.replace(old, new, 1), encoding="utf-8")
    return f"Edited {path}: 1 replacement"


def bash(ctx: RunContext, command: str, timeout: float = 120.0) -> str:
    """Run an unrestricted Bash command with cwd = session world directory.

    Captures stdout AND stderr (combined). Output is truncated at
    ``MAX_BASH_OUTPUT_CHARS`` to bound the model's context.

    Args:
        command: Shell command line passed to ``bash -c``.
        timeout: Seconds before timeout (default 120; matches sandbox).

    Returns:
        ``exit_code=<code>\\n<combined stdout+stderr>`` (truncated if huge).
    """
    try:
        result = run_bash_in_sandbox(
            ctx.deps.session_root, command, timeout=timeout
        )
    except SandboxEscapeError as e:
        raise ModelRetry(f"Bash sandbox error: {e}")
    out = (result.stdout or "") + (result.stderr or "")
    if len(out) > MAX_BASH_OUTPUT_CHARS:
        out = out[:MAX_BASH_OUTPUT_CHARS] + "\n...[truncated]"
    return f"exit_code={result.returncode}\n{out}"


def register_tools(agent) -> None:
    """Register the 4 generalist tools on the given pydantic-ai Agent.

    This is the single chokepoint for tool registration. ``agent.py`` calls
    this and does no tool wiring of its own — the tool surface is locked
    in here.
    """
    agent.tool(read_file)
    agent.tool(write_file)
    agent.tool(edit_file)
    agent.tool(bash)
