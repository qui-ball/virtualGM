"""Sandbox primitive: confine all filesystem + shell ops to the session world dir.

Single source of truth for HARN-02/HARN-03. Every generic tool wrapper
(Read/Write/Edit/Glob/Bash) routes through ``resolve_in_sandbox()`` before
touching disk, and ``run_bash_in_sandbox()`` before invoking a shell.

Design notes
------------
* ``Path.resolve(strict=False)`` is used so a Write target that does not yet
  exist still resolves (the parent chain is canonicalised, the leaf is
  appended). This is what lets the agent create new files inside the session.
* ``resolve()`` follows symlinks, so a symlink pointing outside the root
  resolves to its real target — the containment check then catches it. No
  separate symlink walk is required.
* Bash is intentionally unrestricted (PROJECT.md / CLAUDE.md: full Bash for
  max harness fidelity). The only confinement is ``cwd=session_root``; the
  agent CAN escape via ``cd``. That trade-off is documented as accepted-risk
  T-01-05 in the threat model.
"""
from __future__ import annotations

import subprocess
from pathlib import Path


class SandboxEscapeError(ValueError):
    """Raised when a candidate path or command would escape the session root."""


def resolve_in_sandbox(session_root: Path, candidate: str | Path) -> Path:
    """Resolve ``candidate`` against ``session_root`` and confirm it stays inside.

    Resolves with ``strict=False`` so the target file may not yet exist
    (Write needs that). Rejects:

    * absolute paths not under ``session_root``
    * relative paths whose resolved form escapes via ``..``
    * paths whose resolved form is a symlink target outside ``session_root``

    Returns the absolute, resolved :class:`Path` (always inside the root).

    Raises:
        SandboxEscapeError: on any escape attempt.
    """
    root = Path(session_root).resolve(strict=False)
    candidate_path = Path(candidate)

    if candidate_path.is_absolute():
        joined = candidate_path
    else:
        joined = root / candidate_path

    resolved = joined.resolve(strict=False)

    if resolved == root:
        return resolved
    if root in resolved.parents:
        return resolved

    raise SandboxEscapeError(
        f"Path {candidate!r} resolves to {resolved} which is outside session root {root}"
    )


def run_bash_in_sandbox(
    session_root: Path,
    command: str,
    timeout: float = 120.0,
) -> "subprocess.CompletedProcess[str]":
    """Run ``command`` via ``bash -c`` with ``cwd=session_root``.

    Captures stdout and stderr as text. Does not whitelist commands —
    full unrestricted Bash is an explicit project decision (HARN-03,
    PROJECT.md).

    Raises:
        SandboxEscapeError: if ``session_root`` is not an existing directory.
        subprocess.TimeoutExpired: propagated when ``command`` exceeds
            ``timeout`` seconds (callers decide how to handle).
    """
    root = Path(session_root).resolve(strict=False)
    if not root.is_dir():
        raise SandboxEscapeError(
            f"session_root {root} is not an existing directory"
        )

    return subprocess.run(
        ["bash", "-c", command],
        cwd=root,
        capture_output=True,
        text=True,
        timeout=timeout,
        check=False,
    )
