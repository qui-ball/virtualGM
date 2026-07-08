"""Tests for narration tool-call leak recovery."""

from api.narration_sanitize import extract_leaked_ask_player_roll

SAMPLE = (
    "*Roll a Wit check to spot whatever's hiding in the brush.*"
    "<tool_call>ask_player_roll"
    "<arg_key>dice_count</arg_key><arg_value>1"
    "<arg_key>dice_type</arg_key><arg_value>d20"
    "<arg_key>purpose</arg_key><arg_value>Wit check"
    "<arg_key>stat</arg_key><arg_value>wit"
)


def test_strip_leaked_ask_player_roll():
    cleaned, args = extract_leaked_ask_player_roll(SAMPLE)
    assert cleaned == "*Roll a Wit check to spot whatever's hiding in the brush.*"
    assert args is not None
    assert args["dice_count"] == 1
    assert args["dice_type"] == "d20"
    assert args["purpose"] == "Wit check"
    assert args["stat"] == "wit"


def test_normal_narration_unchanged():
    text = "The wind dies. Something moves in the brush."
    cleaned, args = extract_leaked_ask_player_roll(text)
    assert cleaned == text
    assert args is None
