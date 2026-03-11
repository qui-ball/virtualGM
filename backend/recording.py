"""Raw conversation recorder for synthetic dataset generation.

Records every pydantic-ai message exchange (including tool calls, dynamic
instructions, and game-state snapshots) to JSONL files for later conversion
into fine-tuning datasets.

Usage:
    recorder = Recorder()           # creates recordings/<timestamp>.jsonl
    recorder.record_turn(...)       # call after each completed turn
    recorder.close()                # flush & close
"""

import json
from datetime import datetime, timezone
from pathlib import Path

from pydantic_ai.messages import ModelMessagesTypeAdapter

from game.models import GameState


RECORDINGS_DIR = Path(__file__).parent / "recordings"


def _serialize_game_state(gs: GameState) -> dict:
    """Snapshot GameState into a plain dict (excludes non-serializable fields)."""
    return {
        "pc": gs.pc.model_dump() if gs.pc else None,
        "enemies": {k: v.model_dump() for k, v in gs.enemies.items()},
        "time_counter": gs.time_counter,
        "countdowns": dict(gs.countdowns),
        "in_combat": gs.in_combat,
        "is_boss_battle": gs.is_boss_battle,
        "initiative_order": list(gs.initiative_order),
        "current_turn_index": gs.current_turn_index,
        "campaign_dir": gs.campaign_dir,
        "loaded_sections": dict(gs.loaded_sections),
    }


class Recorder:
    """Appends one JSONL line per completed turn to a session file."""

    def __init__(self, out_dir: Path = RECORDINGS_DIR):
        out_dir.mkdir(parents=True, exist_ok=True)
        ts = datetime.now(timezone.utc).strftime("%Y%m%dT%H%M%SZ")
        self.path = out_dir / f"session_{ts}.jsonl"
        self._fh = open(self.path, "a", encoding="utf-8")
        self._turn = 0

    def record_turn(
        self,
        all_messages: list,
        game_state: GameState,
        narrations: list[str],
        model_name: str,
        user_input: str | None = None,
        new_message_start_idx: int | None = None,
    ) -> None:
        """Write one turn's raw data as a single JSONL line.

        Args:
            all_messages: result.all_messages() — the full conversation so far.
            game_state: GameState snapshot *after* the turn completed.
            narrations: Texts the player saw this turn (from narrate() calls).
            model_name: Which model produced this turn.
            user_input: The player's input that triggered this turn.
            new_message_start_idx: Index where this turn's new messages begin
                in all_messages (so you can slice old vs new).
        """
        self._turn += 1
        record = {
            "turn": self._turn,
            "timestamp": datetime.now(timezone.utc).isoformat(),
            "model_name": model_name,
            "user_input": user_input,
            "new_message_start_idx": new_message_start_idx,
            "narrations": list(narrations),
            "game_state": _serialize_game_state(game_state),
            "messages": json.loads(
                ModelMessagesTypeAdapter.dump_json(all_messages)
            ),
        }
        self._fh.write(json.dumps(record, ensure_ascii=False) + "\n")
        self._fh.flush()

    def close(self) -> None:
        self._fh.close()
