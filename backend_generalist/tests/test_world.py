"""Tests for the per-session world bootstrap (WORLD-02).

`create_session_world()` is the single chokepoint that copies the on-disk
template into a fresh per-session directory at session start. These tests
pin its contract:

* return shape: (session_id: 12-char hex, session_root: existing dir)
* template files are present and byte-identical in the copy
* sequential calls produce distinct session IDs and distinct directories
* edits to the copy never mutate the template (proves deep copy, not symlink)
* a missing template raises FileNotFoundError up front

The CLI in Plan 04 calls this function once at session startup and prints
the returned `(session_id, session_root)` to the user.
"""
from __future__ import annotations

import json
import re
from pathlib import Path

import pytest

from backend_generalist.world import create_session_world


HEX12_RE = re.compile(r"^[0-9a-f]{12}$")


def _build_template(template_dir: Path) -> None:
    """Create a minimal but realistic stand-in template for tests.

    Mirrors the directory shape the function copies in production
    (`pc.json`, `campaign/index.md`, `world/scene.json`,
    `world/encounter.json`, and the ruleset markdown files) without depending
    on the exact bytes of the real template.
    """
    (template_dir / "campaign").mkdir(parents=True)
    (template_dir / "world").mkdir()
    (template_dir / "rules").mkdir()
    (template_dir / "rules" / "spell_list").mkdir()
    (template_dir / "rules" / "class_abilities").mkdir()

    (template_dir / "pc.json").write_text(
        '{"name": "Aldric", "hp": 12, "hp_max": 12}\n', encoding="utf-8"
    )
    (template_dir / "campaign" / "index.md").write_text(
        "# Campaign\n\nA short hook.\n", encoding="utf-8"
    )
    (template_dir / "world" / "scene.json").write_text(
        '{"location": "trail"}\n', encoding="utf-8"
    )
    (template_dir / "world" / "encounter.json").write_text(
        '{"active": false}\n', encoding="utf-8"
    )
    (template_dir / "rules" / "core-ruleset.md").write_text(
        "# Core Rules\n\nd20 + mod vs DC.\n", encoding="utf-8"
    )
    (template_dir / "rules" / "spell_list" / "INDEX.md").write_text(
        "# Spell Lists\n\n- [Mage](mage.md)\n", encoding="utf-8"
    )
    (template_dir / "rules" / "spell_list" / "mage.md").write_text(
        "# Mage Spell List\n\nMagic Missile.\n", encoding="utf-8"
    )
    (template_dir / "rules" / "class_abilities" / "INDEX.md").write_text(
        "# Class Abilities\n\n- [Warrior](warrior.md)\n", encoding="utf-8"
    )
    (template_dir / "rules" / "class_abilities" / "warrior.md").write_text(
        "# Warrior Class Abilities\n\nWarrior abilities.\n", encoding="utf-8"
    )


def test_returns_session_id_and_existing_root(tmp_path: Path) -> None:
    """Test 1: returns (12-char hex session_id, existing absolute Path)."""
    template = tmp_path / "template_world"
    _build_template(template)
    sessions_dir = tmp_path / "sessions"

    session_id, session_root = create_session_world(
        template_dir=template, sessions_dir=sessions_dir
    )

    assert isinstance(session_id, str)
    assert HEX12_RE.match(session_id), f"expected 12-char hex, got {session_id!r}"
    assert isinstance(session_root, Path)
    assert session_root.is_absolute()
    assert session_root.is_dir()
    assert session_root.parent == sessions_dir.resolve()


def test_pc_json_byte_identical_after_copy(tmp_path: Path) -> None:
    """Test 2: session_root/pc.json matches template's pc.json byte-for-byte."""
    template = tmp_path / "template_world"
    _build_template(template)
    sessions_dir = tmp_path / "sessions"

    _, session_root = create_session_world(
        template_dir=template, sessions_dir=sessions_dir
    )

    src_bytes = (template / "pc.json").read_bytes()
    dst_bytes = (session_root / "pc.json").read_bytes()
    assert src_bytes == dst_bytes


def test_all_template_subpaths_present_in_copy(tmp_path: Path) -> None:
    """Test 3: campaign, world state, and all ruleset files are present."""
    template = tmp_path / "template_world"
    _build_template(template)
    sessions_dir = tmp_path / "sessions"

    _, session_root = create_session_world(
        template_dir=template, sessions_dir=sessions_dir
    )

    assert (session_root / "campaign" / "index.md").is_file()
    assert (session_root / "world" / "scene.json").is_file()
    assert (session_root / "world" / "encounter.json").is_file()
    assert (session_root / "rules" / "core-ruleset.md").is_file()
    assert (session_root / "rules" / "spell_list" / "INDEX.md").is_file()
    assert (session_root / "rules" / "spell_list" / "mage.md").is_file()
    assert (session_root / "rules" / "class_abilities" / "INDEX.md").is_file()
    assert (session_root / "rules" / "class_abilities" / "warrior.md").is_file()


def test_two_calls_produce_distinct_sessions(tmp_path: Path) -> None:
    """Test 4: two sequential calls produce distinct session IDs and distinct dirs."""
    template = tmp_path / "template_world"
    _build_template(template)
    sessions_dir = tmp_path / "sessions"

    sid1, root1 = create_session_world(
        template_dir=template, sessions_dir=sessions_dir
    )
    sid2, root2 = create_session_world(
        template_dir=template, sessions_dir=sessions_dir
    )

    assert sid1 != sid2
    assert root1 != root2
    assert root1.is_dir()
    assert root2.is_dir()


def test_editing_session_does_not_mutate_template(tmp_path: Path) -> None:
    """Test 5: writing to session_root/pc.json leaves template's pc.json unchanged.

    This proves we deep-copied (not symlinked) the template.
    """
    template = tmp_path / "template_world"
    _build_template(template)
    sessions_dir = tmp_path / "sessions"

    template_pc = template / "pc.json"
    original_bytes = template_pc.read_bytes()

    _, session_root = create_session_world(
        template_dir=template, sessions_dir=sessions_dir
    )

    # Mutate the session copy.
    (session_root / "pc.json").write_text("corrupted", encoding="utf-8")

    # Template must be untouched.
    assert template_pc.read_bytes() == original_bytes


def test_missing_template_raises_file_not_found(tmp_path: Path) -> None:
    """Test 6: a non-existent template_dir raises FileNotFoundError."""
    with pytest.raises(FileNotFoundError):
        create_session_world(
            template_dir=tmp_path / "missing",
            sessions_dir=tmp_path / "sessions",
        )


def test_social_template_seeds_private_npc_names_not_player_known() -> None:
    """Social template can give the GM names without making them player-known."""
    template = Path(__file__).parents[1] / "social_template_world"
    npcs = json.loads((template / "world" / "npcs.json").read_text())

    assert set(npcs) == {
        "hearing_chair",
        "guild_patron",
        "worker_delegate",
        "junior_clerk",
        "temple_archivist",
    }
    assert npcs["junior_clerk"]["name"] == "Jun Weaver"
    assert all(npc["introduced_to_pc"] is False for npc in npcs.values())
