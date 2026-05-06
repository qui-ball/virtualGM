"""Pin the GM information-boundary contract.

These tests fail loudly if any of the three coordinated fixes regress:
  - SYSTEM_PROMPT loses its Information Boundary section
  - The seeded scene.json reverts the gm_-prefix convention
  - Read-aloud callouts disappear from the marked Part 1 opener files
"""
from __future__ import annotations

import json
from pathlib import Path

from backend_generalist.agent import SYSTEM_PROMPT


TEMPLATE_ROOT = Path(__file__).parent.parent / "template_world"


def test_system_prompt_declares_information_boundary() -> None:
    assert "## Information Boundary" in SYSTEM_PROMPT
    for phrase in ("GM-only", "gm_", "read-aloud", "Wit check", "Boxed text"):
        assert phrase in SYSTEM_PROMPT, f"missing boundary phrase: {phrase}"


def test_scene_template_uses_gm_prefixed_notes() -> None:
    scene = json.loads((TEMPLATE_ROOT / "world" / "scene.json").read_text())
    assert "gm_notes" in scene
    assert "notes" not in scene  # must be renamed, not duplicated


def test_marked_campaign_files_have_read_aloud_callouts() -> None:
    """The three early-game opener files carry > [!read-aloud] callouts.

    Goblin_Ambush.md is the bug-source file: it MUST mark the discovered-
    horses passage read-aloud AND keep the hidden-goblins line outside the
    callout (the original leak).
    """
    marked = [
        TEMPLATE_ROOT / "campaign" / "Introduction" / "Adventure_Hook.md",
        TEMPLATE_ROOT / "campaign" / "Part1_Goblin_Arrows" / "Overview.md",
        TEMPLATE_ROOT / "campaign" / "Part1_Goblin_Arrows" / "Goblin_Ambush.md",
    ]
    for path in marked:
        text = path.read_text()
        assert "> [!read-aloud]" in text, f"missing callout in {path.name}"

    ambush = (TEMPLATE_ROOT / "campaign" / "Part1_Goblin_Arrows" / "Goblin_Ambush.md").read_text()
    # The hidden-goblins line is the leak. It MUST be outside any read-aloud
    # callout block. Every line of a callout block starts with "> ".
    leak_line = "Four goblins are hiding in the woods"
    for line in ambush.splitlines():
        if leak_line in line:
            assert not line.lstrip().startswith(">"), (
                "Goblin_Ambush.md leak line is inside a read-aloud callout — "
                "must remain GM-only."
            )
            break
    else:
        raise AssertionError(f"leak line not found in Goblin_Ambush.md: {leak_line!r}")
