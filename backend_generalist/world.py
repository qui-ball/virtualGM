"""Per-session world directory bootstrap (WORLD-02).

Defines the single chokepoint that the CLI calls at session start:
``create_session_world()`` deep-copies the on-disk template into a fresh
per-session subdirectory and returns ``(session_id, session_root)``.

Design notes
------------
* ``shutil.copytree`` deep-copies the template — symlinks are NOT followed
  by default in Python 3.12 (``symlinks=False`` is the default; the source
  template is hand-authored plain files anyway, so this is belt-and-braces).
* Session ID is ``uuid.uuid4().hex[:12]`` — 48 bits of entropy, plenty for
  a single-user CLI; collision risk documented in plan threat T-02-02.
* ``sessions_dir`` defaults to ``cwd / "sessions"`` so the user always knows
  where session data lives. CLI in Plan 04 prints the absolute path on start.
"""
from __future__ import annotations

import shutil
import uuid
from pathlib import Path
from typing import Tuple

DEFAULT_TEMPLATE_DIR: Path = Path(__file__).parent / "template_world"


def create_session_world(
    template_dir: Path = DEFAULT_TEMPLATE_DIR,
    sessions_dir: Path | None = None,
) -> Tuple[str, Path]:
    """Copy ``template_dir`` into a fresh per-session subdirectory.

    Args:
        template_dir: Source template (defaults to
            ``backend_generalist/template_world``).
        sessions_dir: Parent directory for session subdirectories.
            Defaults to ``Path.cwd() / "sessions"``. Created if missing.

    Returns:
        ``(session_id, session_root)`` — ``session_id`` is a 12-char uuid
        hex string; ``session_root`` is the absolute path to the new
        per-session directory (already populated with the template).

    Raises:
        FileNotFoundError: if ``template_dir`` does not exist or is not a
            directory.
    """
    template_dir = Path(template_dir)
    if not template_dir.is_dir():
        raise FileNotFoundError(
            f"Template directory not found: {template_dir}"
        )

    if sessions_dir is None:
        sessions_dir = Path.cwd() / "sessions"
    sessions_dir = Path(sessions_dir)
    sessions_dir.mkdir(parents=True, exist_ok=True)

    session_id = uuid.uuid4().hex[:12]
    session_root = (sessions_dir / session_id).resolve()
    shutil.copytree(template_dir, session_root)
    return session_id, session_root
