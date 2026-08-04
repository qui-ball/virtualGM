"""In-memory session store for API mode."""

import asyncio
import time
import uuid
from dataclasses import dataclass, field

from pydantic_ai.messages import ModelMessage

from api.schemas import TranscriptEntry
from game.models import GameState


@dataclass
class PendingDeferred:
    """Saved state when the agent awaits a player roll."""

    messages_snapshot: list[ModelMessage]
    deferred_calls: list[dict]  # each: {tool_call_id, tool_name, args}


@dataclass
class Session:
    id: str
    game_state: GameState
    message_history: list[ModelMessage] = field(default_factory=list)
    pending_deferred: PendingDeferred | None = None
    transcript: list[TranscriptEntry] = field(default_factory=list)
    created_at: float = field(default_factory=time.time)
    # Serializes turn execution + post-response compaction so a next-turn request
    # can't read or overwrite message_history mid-compaction.
    lock: asyncio.Lock = field(default_factory=asyncio.Lock)


class SessionStore:
    def __init__(self):
        self._sessions: dict[str, Session] = {}

    def create(self, game_state: GameState | None = None) -> Session:
        session_id = uuid.uuid4().hex[:12]
        session = Session(
            id=session_id,
            game_state=game_state or GameState(),
        )
        self._sessions[session_id] = session
        return session

    def get(self, session_id: str) -> Session | None:
        return self._sessions.get(session_id)

    def delete(self, session_id: str) -> None:
        self._sessions.pop(session_id, None)


# Singleton store
store = SessionStore()
