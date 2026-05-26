"""Tests for GameState as a Pydantic BaseModel with .snapshot()."""

import json

from pydantic import BaseModel

from game.models import CharacterState, EnemyState, GameState


def _make_character() -> CharacterState:
    return CharacterState(
        name="Aldric",
        character_class="warrior",
        hp=12,
        hp_max=12,
        evasion=14,
    )


def _make_enemy() -> EnemyState:
    return EnemyState(name="goblin", hp=7, hp_max=7, evasion=12)


def test_gamestate_is_basemodel():
    assert issubclass(GameState, BaseModel)


def test_no_arg_construction_uses_documented_defaults():
    gs = GameState()
    assert gs.pc is None
    assert gs.enemies == {}
    assert gs.time_counter is None
    assert gs.countdowns == {}
    assert gs.in_combat is False
    assert gs.is_boss_battle is False
    assert gs.initiative_order == []
    assert gs.current_turn_index == 0
    assert gs.campaign_dir is None
    assert gs.loaded_sections == {}
    assert gs.max_loaded_sections == 3
    assert gs.narrations == []
    assert gs._event_queue is None


def test_snapshot_empty_state_shape():
    gs = GameState()
    snap = gs.snapshot()
    assert snap == {
        "character": None,
        "enemies": {},
        "countdowns": {},
        "in_combat": False,
    }


def test_snapshot_keys_are_exactly_four():
    gs = GameState()
    assert sorted(gs.snapshot().keys()) == [
        "character",
        "countdowns",
        "enemies",
        "in_combat",
    ]


def test_snapshot_pc_renamed_to_character():
    pc = _make_character()
    gs = GameState()
    gs.pc = pc
    snap = gs.snapshot()
    assert "pc" not in snap
    assert snap["character"] == pc.model_dump()


def test_snapshot_enemies_serialized_by_id():
    enemy = _make_enemy()
    gs = GameState()
    gs.enemies["goblin"] = enemy
    snap = gs.snapshot()
    assert snap["enemies"]["goblin"] == enemy.model_dump()


def test_snapshot_passes_through_countdowns_and_in_combat():
    gs = GameState()
    gs.countdowns["alarm"] = 3
    gs.in_combat = True
    snap = gs.snapshot()
    assert snap["countdowns"] == {"alarm": 3}
    assert snap["in_combat"] is True


def test_excluded_and_private_fields_absent_from_serialization():
    gs = GameState()
    # populate to a NON-EMPTY value so a forgotten exclude=True is caught
    gs.narrations.append("a private note")
    gs._event_queue = object()

    dumped = gs.model_dump()
    assert "narrations" not in dumped
    assert "_event_queue" not in dumped

    snap = gs.snapshot()
    assert "narrations" not in snap
    assert "_event_queue" not in snap
    assert sorted(snap.keys()) == [
        "character",
        "countdowns",
        "enemies",
        "in_combat",
    ]


def test_snapshot_byte_compat_with_old_gamestatesnapshot_mirror():
    # Pin INV-01: snapshot() output must stay byte-identical to the now-removed
    # GameStateSnapshot mirror's model_dump(). Reconstruct that mirror locally and
    # compare canonical JSON so any drift (renamed/dropped key, changed nested
    # model_dump) fails CI.
    class _OldMirror(BaseModel):
        character: CharacterState | None
        enemies: dict[str, EnemyState]
        countdowns: dict[str, int]
        in_combat: bool

    gs = GameState()
    gs.pc = _make_character()
    gs.enemies["goblin"] = _make_enemy()
    gs.countdowns["alarm"] = 3
    gs.in_combat = True

    old_wire = json.dumps(
        _OldMirror(
            character=gs.pc,
            enemies=gs.enemies,
            countdowns=gs.countdowns,
            in_combat=gs.in_combat,
        ).model_dump(),
        sort_keys=True,
    )
    new_wire = json.dumps(gs.snapshot(), sort_keys=True)
    assert new_wire == old_wire


def test_in_place_mutation_does_not_raise():
    gs = GameState()
    gs.pc = _make_character()
    gs.pc.conditions.append("poisoned")
    gs.enemies["x"] = _make_enemy()
    del gs.enemies["x"]
    gs.countdowns["c"] = 3
    gs.in_combat = True
    gs.narrations.append("t")
    sentinel = object()
    gs._event_queue = sentinel
    assert gs._event_queue is sentinel
