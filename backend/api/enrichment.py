"""Enrich PendingAction from tool args + game state (G1, G11)."""

import re
from typing import Any

from api.schemas import PendingAction
from game.models import CharacterState, GameState

STAT_HINTS: list[tuple[re.Pattern[str], str]] = [
    (re.compile(r"\bmight\b|\bmig\b", re.I), "might"),
    (re.compile(r"\bfinesse\b|\bfin\b", re.I), "finesse"),
    (re.compile(r"\bwit\b", re.I), "wit"),
    (re.compile(r"\bpresence\b|\bpre\b", re.I), "presence"),
]

SHORT_TO_STAT = {
    "mig": "might",
    "fin": "finesse",
    "wit": "wit",
    "pre": "presence",
}

STAT_SHORT = {
    "might": "Mig",
    "finesse": "Fin",
    "wit": "Wit",
    "presence": "Pre",
}


def _normalize_stat(value: str | None) -> str | None:
    if not value:
        return None
    lower = value.lower()
    if lower in STAT_SHORT:
        return lower
    return SHORT_TO_STAT.get(lower)


def _infer_stat(args: dict[str, Any], character: CharacterState | None) -> str | None:
    if args.get("stat"):
        return _normalize_stat(str(args["stat"]))
    haystack = f"{args.get('purpose', '')} {args.get('action_type', '')}"
    for pattern, key in STAT_HINTS:
        if pattern.search(haystack):
            return key
    if character:
        if re.search(r"attack|weapon|strike|hit", haystack, re.I):
            return "might"
        if re.search(r"save|resist", haystack, re.I):
            return "presence"
        if re.search(r"check|trick|arcane|spell", haystack, re.I):
            return "wit"
    return None


def _parse_adv(value: str | None) -> str:
    if value in ("norm", "adv", "dis"):
        return value
    return "norm"


def build_pending_action(
    tool_name: str,
    tool_call_id: str,
    args: dict[str, Any],
    game_state: GameState,
) -> PendingAction:
    character = game_state.pc
    stat_key = _infer_stat(args, character)
    modifier = args.get("modifier")
    if modifier is None and stat_key and character:
        modifier = getattr(character.stats, stat_key, 0)
    if modifier is None:
        modifier = 0

    dc = args.get("dc")
    if dc is None:
        dc = 13

    vs_label = args.get("vs_label")
    if vs_label is None and character and re.search(
        r"attack|hit|vs", str(args.get("purpose", "")), re.I
    ):
        vs_label = f"vs Eva {character.evasion}"
    elif vs_label is None:
        vs_label = f"DC {dc}"

    adv_type = _parse_adv(args.get("adv_type"))
    footer = args.get("footer")
    if footer is None and args.get("dice_type", "d20") == "d20":
        footer = "crit on nat-20"

    stat_short = STAT_SHORT.get(stat_key) if stat_key else None

    return PendingAction(
        action_type=tool_name,
        dice_count=int(args.get("dice_count", 1)),
        dice_type=args.get("dice_type", "d20"),
        purpose=str(args.get("purpose", "")),
        tool_call_id=tool_call_id,
        stat=stat_short or stat_key,
        modifier=int(modifier),
        dc=int(dc),
        vs_label=str(vs_label),
        adv_type=adv_type,
        adv_reason=args.get("adv_reason"),
        success_text=args.get("success_text"),
        fail_text=args.get("fail_text"),
        footer=footer,
    )
