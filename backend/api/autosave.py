"""Post-turn auto-save of playthrough snapshot + transcript (Feature 07)."""

from __future__ import annotations

from loguru import logger

from catalog import transcript_archive as transcript_arch
from catalog.playthrough_store import playthrough_store
from game.session import Session
from game.state_codec import game_state_to_dict


def autosave_session(session: Session) -> None:
    """Persist full GameState + transcript for the playthrough bound to this session.

    No-op when the session is not linked to a playthrough (legacy /sessions).
    Failures are logged and never raised — auto-save must not break play.
    """
    try:
        pt = playthrough_store.find_by_session_id(session.id)
        if pt is None:
            return
        gs = session.game_state
        if gs.pc is None:
            return
        playthrough_store.save_progress(
            pt.id,
            pc=gs.pc,
            chapter=gs.chapter,
            time_current=gs.time_current,
            time_max=gs.time_max,
            last_scene=gs.scene_label,
            session_id=session.id,
            game_state=game_state_to_dict(gs),
        )
        raw_entries = [
            e.model_dump() if hasattr(e, "model_dump") else e
            for e in session.transcript
        ]
        transcript_arch.replace_live_transcript(pt.id, raw_entries)
        logger.debug(f"Auto-saved playthrough {pt.id} from session {session.id}")
    except Exception as exc:  # noqa: BLE001
        logger.warning(f"Auto-save skipped: {exc}")
