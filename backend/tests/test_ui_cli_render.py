"""U4: turning cumulative narration payloads into terminal output.

narration_delta carries the whole narration so far, so printing each payload whole would
repeat the text once per token — 80+ times on a typical turn, and invisible to the eye on a
fast stream. The suffix diffing is kept pure precisely so it can be asserted here.
"""

import os

import click

import cli_render
from cli_render import (
    NarrationTracker,
    close_open_line,
    discard_open_narrations,
    render_narration_delta,
    render_narration_discard,
    render_narration_settle,
)

FULL = "The iron box is cold. Something inside it shifts."


def delta(tool_call_id, text):
    return {"tool_call_id": tool_call_id, "text": text}


# --------------------------------------------------------------------------- #
# Suffix diffing (pure)
# --------------------------------------------------------------------------- #
def test_successive_payloads_yield_only_the_newly_appended_text():
    tracker = NarrationTracker()
    payloads = [FULL[:n] for n in (4, 12, 30, len(FULL))]

    suffixes = [tracker.advance("call-1", p) for p in payloads]

    assert "".join(suffixes) == FULL
    assert suffixes[0] == FULL[:4]
    assert all(s for s in suffixes), "each growing payload should print something"


def test_repeated_identical_payload_yields_an_empty_suffix():
    tracker = NarrationTracker()
    tracker.advance("call-1", FULL)

    assert tracker.advance("call-1", FULL) == ""


def test_shorter_payload_does_not_emit_a_negative_or_garbled_suffix():
    """A sanitizer rewrite mid-stream must not produce garbage; a terminal cannot unprint."""
    tracker = NarrationTracker()
    tracker.advance("call-1", FULL)

    assert tracker.advance("call-1", FULL[:10]) == ""
    # What is on screen is still the longer text, so later growth diffs against that.
    assert tracker.advance("call-1", FULL + " More.") == " More."


def test_payload_that_diverges_mid_string_emits_nothing():
    tracker = NarrationTracker()
    tracker.advance("call-1", "The iron box is cold.")

    assert tracker.advance("call-1", "A different sentence entirely.") == ""


def test_two_interleaved_tool_call_ids_track_independent_state():
    tracker = NarrationTracker()

    assert tracker.advance("call-a", "Alpha") == "Alpha"
    assert tracker.advance("call-b", "Beta") == "Beta"
    assert tracker.advance("call-a", "Alpha one.") == " one."
    assert tracker.advance("call-b", "Beta two.") == " two."


def test_is_open_reflects_lifecycle():
    tracker = NarrationTracker()
    assert tracker.is_open("call-1") is False

    tracker.advance("call-1", "Alpha")
    assert tracker.is_open("call-1") is True

    tracker.close("call-1")
    assert tracker.is_open("call-1") is False


def test_close_is_a_no_op_for_an_unknown_id():
    NarrationTracker().close("never-seen")  # must not raise


def test_reopening_a_closed_id_starts_from_scratch():
    tracker = NarrationTracker()
    tracker.advance("call-1", FULL)
    tracker.close("call-1")

    assert tracker.advance("call-1", FULL) == FULL


# --------------------------------------------------------------------------- #
# Rendering
# --------------------------------------------------------------------------- #
def printed(capsys):
    return capsys.readouterr().out


def strip_ansi(text):
    import re

    return re.sub(r"\033\[[0-9;]*[A-Za-z]|\r", "", text)


def test_streamed_narration_prints_each_slice_once(capsys):
    tracker = NarrationTracker()
    for n in (4, 12, 30, len(FULL)):
        render_narration_delta(tracker, delta("call-1", FULL[:n]))
    render_narration_settle(tracker, delta("call-1", FULL))

    output = strip_ansi(printed(capsys))

    assert output == f"📜 {FULL}\n"
    assert output.count("The iron box") == 1, "cumulative payloads must not reprint"


def test_settle_with_no_prior_deltas_prints_the_full_text_once(capsys):
    tracker = NarrationTracker()
    render_narration_settle(tracker, delta("call-1", FULL))

    assert strip_ansi(printed(capsys)) == f"📜 {FULL}\n"


def test_settle_prints_the_authoritative_tail_the_stream_missed(capsys):
    tracker = NarrationTracker()
    render_narration_delta(tracker, delta("call-1", FULL[:20]))
    render_narration_settle(tracker, delta("call-1", FULL))

    assert strip_ansi(printed(capsys)) == f"📜 {FULL}\n"


def test_discard_retracts_a_streaming_narration_visibly(capsys):
    tracker = NarrationTracker()
    render_narration_delta(tracker, delta("call-1", "The goblin crumples and di"))
    render_narration_discard(tracker, delta("call-1", ""))

    output = strip_ansi(printed(capsys))

    assert "narration discarded" in output
    assert tracker.is_open("call-1") is False


def test_rows_occupied_counts_wrapped_and_newline_separated_rows(monkeypatch):
    """Narration spans paragraphs and wraps; clearing one row leaves most of it readable.

    The escape sequences themselves can't be asserted through capsys — click strips ANSI when
    stdout isn't a tty — so the row arithmetic that drives them is tested directly.
    """
    monkeypatch.setattr(
        cli_render.shutil, "get_terminal_size", lambda fallback=(80, 24): os.terminal_size((20, 24))
    )

    assert cli_render.rows_occupied("short") == 1
    assert cli_render.rows_occupied("one\ntwo\nthree") == 3
    # 45 chars across 20 columns wraps to 3 rows.
    assert cli_render.rows_occupied("x" * 45) == 3
    # A blank line still occupies a row.
    assert cli_render.rows_occupied("a\n\nb") == 3
    # The "📜 " prefix pushes the first row over the wrap boundary.
    assert cli_render.rows_occupied("x" * 20) == 1
    assert cli_render.rows_occupied("x" * 20, prefix_width=2) == 2


def test_discard_notice_is_printed_for_a_multi_row_narration(capsys):
    tracker = NarrationTracker()
    render_narration_delta(tracker, delta("call-1", "one\ntwo\nthree"))
    capsys.readouterr()

    render_narration_discard(tracker, delta("call-1", ""))

    assert "narration discarded" in strip_ansi(printed(capsys))
    assert tracker.is_open("call-1") is False


def test_close_open_line_only_breaks_when_a_narration_is_open(capsys):
    tracker = NarrationTracker()
    close_open_line(tracker)
    assert printed(capsys) == "", "nothing open — must not emit a stray blank line"

    render_narration_delta(tracker, delta("call-1", "Alpha"))
    capsys.readouterr()
    close_open_line(tracker)

    assert printed(capsys) == "\n"


def test_turn_end_sweep_retracts_narration_the_stream_never_resolved(capsys):
    """A transport drop ends the stream with no backend discard."""
    tracker = NarrationTracker()
    render_narration_delta(tracker, delta("call-1", "Half a sen"))
    capsys.readouterr()

    discard_open_narrations(tracker)

    assert "narration discarded" in strip_ansi(printed(capsys))
    assert tracker.open_ids() == []


def test_discard_for_an_unknown_or_settled_id_prints_nothing(capsys):
    tracker = NarrationTracker()
    render_narration_settle(tracker, delta("call-1", FULL))
    capsys.readouterr()

    render_narration_discard(tracker, delta("call-1", ""))
    render_narration_discard(tracker, delta("never-seen", ""))

    assert printed(capsys) == ""


def test_a_discarded_narration_can_be_followed_by_a_fresh_one(capsys):
    """AE3's shape: the vetoed bubble goes, then the retried narration streams into a new one."""
    tracker = NarrationTracker()
    render_narration_delta(tracker, delta("call-1", "It dies."))
    render_narration_discard(tracker, delta("call-1", ""))
    capsys.readouterr()

    render_narration_delta(tracker, delta("call-2", "Your blade bites deep."))
    render_narration_settle(tracker, delta("call-2", "Your blade bites deep."))

    assert strip_ansi(printed(capsys)) == "📜 Your blade bites deep.\n"


def test_two_concurrent_narrations_each_settle_on_their_own_id(capsys):
    tracker = NarrationTracker()
    render_narration_delta(tracker, delta("call-a", "Alpha"))
    render_narration_settle(tracker, delta("call-a", "Alpha one."))
    render_narration_delta(tracker, delta("call-b", "Beta"))
    render_narration_settle(tracker, delta("call-b", "Beta two."))

    assert strip_ansi(printed(capsys)) == "📜 Alpha one.\n📜 Beta two.\n"


# --------------------------------------------------------------------------- #
# render_event dispatch
# --------------------------------------------------------------------------- #
def _ctx(json_mode=False):
    return click.Context(click.Command("x"), obj={
        "json_mode": json_mode,
        "narration": NarrationTracker(),
    })


def test_render_event_streams_narration_without_the_unknown_event_fallback(capsys):
    from ui_cli import render_event

    ctx = _ctx()
    render_event(ctx, "narration_delta", delta("call-1", "Alpha"))
    render_event(ctx, "narration", delta("call-1", "Alpha one."))

    output = strip_ansi(printed(capsys))

    assert output == "📜 Alpha one.\n"
    assert "narration_delta" not in output, "must not fall through to the raw-JSON branch"


def test_json_mode_dumps_every_event_verbatim(capsys):
    from ui_cli import render_event

    ctx = _ctx(json_mode=True)
    render_event(ctx, "narration_delta", delta("call-1", "Alpha"))
    render_event(ctx, "narration_discard", {"tool_call_id": "call-1"})

    lines = printed(capsys).strip().splitlines()

    assert lines == [
        '{"event": "narration_delta", "tool_call_id": "call-1", "text": "Alpha"}',
        '{"event": "narration_discard", "tool_call_id": "call-1"}',
    ]
