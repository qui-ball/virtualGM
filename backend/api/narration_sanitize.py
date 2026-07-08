"""Strip model-leaked tool markup from player-facing narration."""

from __future__ import annotations

import re
from typing import Any

LEAKED_TOOL_BLOCK = re.compile(
    r"<tool_call>\s*(?P<tool>\w+)(?P<body>.*?)(?:</tool_call>|$)",
    re.IGNORECASE | re.DOTALL,
)
ARG_PAIR = re.compile(
    r"<arg_key>\s*(?P<key>[^<]+?)\s*</arg_key>\s*<arg_value>\s*"
    r"(?P<value>.*?)(?=\s*<arg_key>|</tool_call>|$)",
    re.IGNORECASE | re.DOTALL,
)
DANGLING_TOOL_TAIL = re.compile(
    r"<tool_call>.*$",
    re.IGNORECASE | re.DOTALL,
)

_INT_FIELDS = frozenset({"dice_count", "modifier", "dc"})


def _parse_arg_pairs(body: str) -> dict[str, str]:
    args: dict[str, str] = {}
    for match in ARG_PAIR.finditer(body):
        args[match.group("key").strip()] = match.group("value").strip()
    return args


def _coerce_roll_args(raw: dict[str, str]) -> dict[str, Any]:
    out: dict[str, Any] = {}
    for key, value in raw.items():
        if key in _INT_FIELDS:
            try:
                out[key] = int(value)
            except ValueError:
                out[key] = value
        else:
            out[key] = value
    out.setdefault("dice_count", 1)
    out.setdefault("dice_type", "d20")
    return out


def extract_leaked_ask_player_roll(text: str) -> tuple[str, dict[str, Any] | None]:
    """Remove leaked tool-call markup; recover ask_player_roll args when present."""
    leaked_args: dict[str, Any] | None = None

    def repl(match: re.Match[str]) -> str:
        nonlocal leaked_args
        if match.group("tool").lower() != "ask_player_roll" or leaked_args is not None:
            return ""
        raw = _parse_arg_pairs(match.group("body"))
        if raw:
            leaked_args = _coerce_roll_args(raw)
        return ""

    cleaned = LEAKED_TOOL_BLOCK.sub(repl, text)
    cleaned = DANGLING_TOOL_TAIL.sub("", cleaned).strip()
    return cleaned, leaked_args
