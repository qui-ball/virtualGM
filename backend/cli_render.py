"""Terminal rendering shared by both CLIs.

ui_cli.py reads events off SSE; cli.py gets the same events in-process from the agent run.
The narration renderers live here rather than in either CLI so the in-process one does not
have to depend on the HTTP one just to print a bubble.
"""

from __future__ import annotations

import math
import shutil
import sys

import click


class C:
    RESET = "\033[0m"
    DIM = "\033[90m"
    BOLD = "\033[1m"
    GREEN = "\033[32m"
    YELLOW = "\033[33m"
    RED = "\033[31m"
    CYAN = "\033[36m"
    MAGENTA = "\033[35m"


def _c(text, color):
    return f"{color}{text}{C.RESET}"


def out(text=""):
    click.echo(text)


def write(text):
    """Print without a trailing newline, flushed — for text that arrives a token at a time."""
    if text:
        click.echo(text, nl=False)
    sys.stdout.flush()


class NarrationTracker:
    """Turn cumulative narration payloads into the slice that still needs printing.

    narration_delta carries the whole narration so far, not the fragment that grew it — that
    is what makes the events idempotent for the web client. A terminal is append-only, so
    printing each payload whole would repeat the narration once per token (80+ times on a
    typical turn). This tracks what has already been written, per tool call id, and hands back
    only the new tail.

    Pure by design: it never prints. That keeps the diffing directly testable, which matters
    because reprinting is invisible to the eye on a fast stream.
    """

    def __init__(self):
        self._printed: dict[str, str] = {}

    def is_open(self, tool_call_id: str) -> bool:
        """True once anything has been written for this narration and before it is closed."""
        return tool_call_id in self._printed

    def advance(self, tool_call_id: str, cumulative: str) -> str:
        """Record `cumulative` as printed and return the text that was newly appended.

        A payload that is not a forward extension of what is already on screen — the
        sanitizer rewriting or shrinking the text mid-stream — yields "". A terminal cannot
        unprint, so the safe move is to add nothing rather than emit a garbled or negative
        slice; the settle reconciles against the authoritative text.
        """
        printed = self._printed.get(tool_call_id, "")
        if not cumulative.startswith(printed):
            self._printed.setdefault(tool_call_id, printed)
            return ""
        self._printed[tool_call_id] = cumulative
        return cumulative[len(printed):]

    def printed(self, tool_call_id: str) -> str:
        """What has been written to the terminal for this narration so far."""
        return self._printed.get(tool_call_id, "")

    def open_ids(self) -> list[str]:
        """Narrations that have been written to but not yet settled or discarded."""
        return list(self._printed)

    def close(self, tool_call_id: str) -> None:
        """Forget a narration once it has settled or been discarded."""
        self._printed.pop(tool_call_id, None)


def render_narration_delta(tracker: NarrationTracker, data: dict) -> None:
    """Paint the newly-arrived slice of an in-flight narration."""
    tool_call_id = data.get("tool_call_id") or ""
    opening = not tracker.is_open(tool_call_id)
    suffix = tracker.advance(tool_call_id, data.get("text") or "")
    if opening:
        write(_c("📜 ", C.GREEN))
    write(suffix)


def render_narration_settle(tracker: NarrationTracker, data: dict) -> None:
    """Close out a narration against the authoritative text narrate() recorded."""
    tool_call_id = data.get("tool_call_id") or ""
    opening = not tracker.is_open(tool_call_id)
    # A settle with no prior deltas — an atomic provider, or a consumer that missed the
    # stream — prints the whole thing, exactly as before streaming existed.
    suffix = tracker.advance(tool_call_id, data.get("text") or "")
    if opening:
        write(_c("📜 ", C.GREEN))
    write(suffix)
    tracker.close(tool_call_id)
    out()


def rows_occupied(text: str, prefix_width: int = 0) -> int:
    """How many terminal rows `text` occupies, accounting for wrapping and newlines."""
    width = max(1, shutil.get_terminal_size(fallback=(80, 24)).columns)
    rows = 0
    for i, line in enumerate(text.split("\n")):
        visible = len(line) + (prefix_width if i == 0 else 0)
        rows += max(1, math.ceil(visible / width)) if visible else 1
    return rows


def render_narration_discard(tracker: NarrationTracker, data: dict) -> None:
    """Pull back a provisional narration the tool then dropped or vetoed."""
    tool_call_id = data.get("tool_call_id") or ""
    if not tracker.is_open(tool_call_id):
        return  # Already settled, or never streamed — nothing on screen to retract.
    # Narration is multi-paragraph and wraps, so it usually occupies many rows. Erasing only
    # the row the cursor sits on would leave most of the abandoned text readable, which is
    # exactly what a discard exists to prevent.
    rows = rows_occupied(tracker.printed(tool_call_id), prefix_width=len("📜 "))
    tracker.close(tool_call_id)
    write("\r\033[2K" + "\033[1A\033[2K" * (rows - 1))
    out(_c("⌫ narration discarded (omitted or vetoed)", C.YELLOW))


def close_open_line(tracker: NarrationTracker) -> None:
    """End the in-progress narration row before something else prints.

    Narration is written without a trailing newline so the next token can continue it. Any
    other output — a thinking line, a roll prompt, an error, a tracing line — would otherwise
    be spliced onto the end of the narration mid-sentence.
    """
    if tracker.open_ids():
        out()


def discard_open_narrations(tracker: NarrationTracker) -> None:
    """Retract every narration still open — the CLI's equivalent of the client's turn-end sweep.

    A transport-level drop kills the stream without the backend ever emitting a discard, so
    without this the terminal keeps an unterminated half-sentence that reads like real GM output.
    """
    for tool_call_id in tracker.open_ids():
        render_narration_discard(tracker, {"tool_call_id": tool_call_id})
