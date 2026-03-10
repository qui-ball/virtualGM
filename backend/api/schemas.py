"""API request/response Pydantic models."""

from pydantic import BaseModel, Field

from game.models import CharacterState, ConditionName, DiceType, EnemyState


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


class GameStateSnapshot(BaseModel):
    character: CharacterState | None = None
    enemies: dict[str, EnemyState] = Field(default_factory=dict)
    countdowns: dict[str, int] = Field(default_factory=dict)
    in_combat: bool = False


class TurnResponse(BaseModel):
    status: str  # "complete" | "pending_action"
    narrations: list[str] = Field(default_factory=list)
    pending_action: PendingAction | None = None
    game_state: GameStateSnapshot
    internal_notes: str | None = None


class CreateSessionResponse(BaseModel):
    session_id: str
    character_name: str


class MessageEntry(BaseModel):
    role: str
    content: str
    timestamp: str | None = None


class MessagesResponse(BaseModel):
    messages: list[MessageEntry]
