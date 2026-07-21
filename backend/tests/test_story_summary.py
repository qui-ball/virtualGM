"""U1: story-summary state and instruction injection."""

from types import SimpleNamespace

from agent.definition import story_so_far
from game.models import GameState


def _ctx(gs: GameState):
    """Minimal RunContext stand-in — story_so_far only reads ctx.deps."""
    return SimpleNamespace(deps=gs)


def test_no_summary_injects_nothing():
    # AE4 / R10: before any compaction, no story-so-far block appears.
    gs = GameState()
    assert gs.story_summary is None
    assert story_so_far(_ctx(gs)) == ""


def test_summary_wrapped_in_tag():
    # AE4 / R9: once set, the summary is injected wrapped in <story_so_far>.
    gs = GameState()
    gs.story_summary = "The party fled the goblin ambush and reached Phandalin."
    out = story_so_far(_ctx(gs))
    assert out == (
        "<story_so_far>\n"
        "The party fled the goblin ambush and reached Phandalin.\n"
        "</story_so_far>"
    )


def test_empty_string_summary_treated_as_absent():
    # R10 boundary: a falsy summary must not emit an empty tagged block.
    gs = GameState()
    gs.story_summary = ""
    assert story_so_far(_ctx(gs)) == ""
