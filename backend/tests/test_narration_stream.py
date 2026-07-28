"""U1: the narrate() argument-delta accumulator.

Drives the accumulator with synthetic fragment sequences — no model, no network. This is
where the partial-JSON and sanitize logic is proven; everything downstream just plumbs
the reveals it produces.
"""

import json

from agent.narration_stream import NarrationStream, partial_narration_text

FULL = "The iron box is cold. Something inside it shifts. What do you do?"


def fragments(text: str, size: int) -> list[str]:
    """Split a complete args blob into `size`-char fragments, the way a provider would."""
    blob = json.dumps({"text": text})
    return [blob[i : i + size] for i in range(0, len(blob), size)]


def drive(stream: NarrationStream, call_id: str, frags) -> list[str]:
    """Feed fragments and collect only the reveals that actually fired."""
    reveals = []
    for frag in frags:
        text = stream.feed(call_id, frag)
        if text is not None:
            reveals.append(text)
    return reveals


# --------------------------------------------------------------------------- #
# partial_narration_text
# --------------------------------------------------------------------------- #
def test_partial_text_from_incomplete_blob():
    assert partial_narration_text('{"text":"The iron b') == "The iron b"


def test_partial_text_none_before_key_is_parseable():
    assert partial_narration_text('{"te') is None


def test_partial_text_none_for_empty_and_garbage():
    assert partial_narration_text("") is None
    assert partial_narration_text("not json at all") is None


def test_partial_text_ignores_non_string_text_field():
    assert partial_narration_text('{"text": 42}') is None


# --------------------------------------------------------------------------- #
# Reveal behavior (AE1, AE5)
# --------------------------------------------------------------------------- #
def test_fragments_produce_strictly_growing_reveals_ending_at_full_text():
    """Covers AE1."""
    stream = NarrationStream()
    reveals = drive(stream, "call-1", fragments(FULL, 7))

    assert len(reveals) > 1, "expected progressive reveals, not one blob"
    assert reveals[-1] == FULL
    for earlier, later in zip(reveals, reveals[1:]):
        assert len(later) > len(earlier)
        assert later.startswith(earlier)


def test_fragment_split_mid_key_yields_no_reveal_until_text_parses():
    stream = NarrationStream()
    assert stream.feed("call-1", '{"te') is None
    assert stream.feed("call-1", 'xt":"') == ""
    assert stream.feed("call-1", "Ash.") == "Ash."


def test_single_complete_blob_produces_exactly_one_reveal():
    """Covers AE5 — an atomic provider degrades to one reveal, no error."""
    stream = NarrationStream()
    reveals = drive(stream, "call-1", [json.dumps({"text": FULL})])

    assert reveals == [FULL]


def test_dict_args_delta_produces_one_reveal():
    stream = NarrationStream()
    assert stream.feed("call-1", {"text": FULL}) == FULL


def test_consecutive_identical_parses_emit_one_reveal():
    stream = NarrationStream()
    assert stream.feed("call-1", '{"text":"Ash."') == "Ash."
    # Trailing structural characters add no new visible text.
    assert stream.feed("call-1", "}") is None


def test_buffer_that_never_becomes_valid_json_yields_nothing_and_raises_nothing():
    stream = NarrationStream()
    reveals = drive(stream, "call-1", ["<<", "not", " json", " ever"])

    assert reveals == []


def test_empty_and_none_fragments_are_ignored():
    stream = NarrationStream()
    assert stream.feed("call-1", "") is None
    assert stream.feed("call-1", None) is None
    assert stream.feed("call-1", {}) is None
    assert stream.feed("call-1", '{"text":"Ash."}') == "Ash."


# --------------------------------------------------------------------------- #
# Sanitization (AE2 / R5)
# --------------------------------------------------------------------------- #
LEAK_TEXT = (
    "The wind dies."
    "<tool_call>ask_player_roll"
    "<arg_key>dice_count</arg_key><arg_value>1"
    "<arg_key>dice_type</arg_key><arg_value>d20"
)


def test_leaked_markup_never_appears_in_any_reveal():
    """Covers AE2 — markup is stripped at every intermediate point, not just at the end."""
    stream = NarrationStream()
    reveals = drive(stream, "call-1", fragments(LEAK_TEXT, 3))

    assert reveals, "expected at least the clean prefix to be revealed"
    for reveal in reveals:
        assert "<tool_call" not in reveal
        assert "ask_player_roll" not in reveal
        assert "arg_key" not in reveal
    assert reveals[-1] == "The wind dies."


def test_partial_open_tag_is_held_back_until_it_resolves():
    """A trailing `<t…` could be the start of leaked markup — never paint it."""
    stream = NarrationStream()
    assert stream.feed("call-1", '{"text":"The wind dies.') == "The wind dies."
    assert stream.feed("call-1", "<to") is None
    assert stream.feed("call-1", "ol_call>ask_player_roll") is None


def test_narration_that_sanitizes_to_empty_reveals_empty_string_not_markup():
    stream = NarrationStream()
    blob = json.dumps({"text": "<tool_call>ask_player_roll<arg_key>dice_type</arg_key>"})
    reveals = drive(stream, "call-1", [blob])

    assert all(reveal == "" for reveal in reveals)


# --------------------------------------------------------------------------- #
# Per-call isolation (R4)
# --------------------------------------------------------------------------- #
def test_two_interleaved_call_ids_do_not_cross_contaminate():
    """Covers R4."""
    stream = NarrationStream()

    assert stream.feed("call-a", '{"text":"Alpha') == "Alpha"
    assert stream.feed("call-b", '{"text":"Beta') == "Beta"
    assert stream.feed("call-a", ' one."}') == "Alpha one."
    assert stream.feed("call-b", ' two."}') == "Beta two."


def test_open_ids_tracks_calls_until_closed():
    stream = NarrationStream()
    stream.feed("call-a", '{"text":"Alpha"}')
    stream.feed("call-b", '{"text":"Beta"}')

    assert set(stream.open_ids()) == {"call-a", "call-b"}

    stream.close("call-a")
    assert stream.open_ids() == ["call-b"]

    stream.close_all()
    assert stream.open_ids() == []


def test_close_is_a_no_op_for_an_unknown_id():
    stream = NarrationStream()
    stream.close("never-seen")  # must not raise

    assert stream.open_ids() == []


def test_closing_a_call_resets_its_state_for_reuse():
    stream = NarrationStream()
    stream.feed("call-a", '{"text":"Alpha"}')
    stream.close("call-a")

    assert stream.feed("call-a", '{"text":"Alpha"}') == "Alpha"


# --------------------------------------------------------------------------- #
# Purity (KTD5)
# --------------------------------------------------------------------------- #
def test_module_has_no_agent_or_network_dependency():
    import agent.narration_stream as mod

    source = open(mod.__file__, encoding="utf-8").read()
    assert "pydantic_ai" not in source
    assert "httpx" not in source
