"""API request/response Pydantic models."""

from pydantic import BaseModel

from game.models import DiceType


# -- Requests --


class CreateSessionRequest(BaseModel):
    character_name: str | None = None


class ActionResponse(BaseModel):
    """Player's response to a pending dice-roll action."""

    roll_result: int
    individual_rolls: list[int] | None = None


class TurnRequest(BaseModel):
    message: str | None = None
    action_response: ActionResponse | None = None


# -- Responses --


class PendingAction(BaseModel):
    action_type: str
    dice_count: int
    dice_type: DiceType
    purpose: str
    tool_call_id: str


class CreateSessionResponse(BaseModel):
    session_id: str
    character_name: str


class MessageEntry(BaseModel):
    role: str
    content: str
    timestamp: str | None = None


class MessagesResponse(BaseModel):
    messages: list[MessageEntry]
