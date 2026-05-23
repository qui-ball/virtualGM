"""API request/response Pydantic models."""

from typing import Literal

from pydantic import BaseModel, Field

from game.models import CharacterState, ConditionName, DiceType, EnemyState, SpellDefinition

# -- Requests --


class CreateSessionRequest(BaseModel):
    character_name: str | None = None


class ActionResponse(BaseModel):
    """Player's response to a pending dice-roll action."""

    roll_result: int
    individual_rolls: list[int] | None = None


class CastSpellRequest(BaseModel):
    spell_id: str
    tier: Literal["Minor", "Major", "Mythic"]
    mp_cost: int


class TurnRequest(BaseModel):
    message: str | None = None
    action_response: ActionResponse | None = None
    rest_type: Literal["short", "long"] | None = None
    use_item: str | None = None
    cast_spell: CastSpellRequest | None = None


class LevelUpRequest(BaseModel):
    kind: Literal["hp", "evasion", "ability"]
    hp_mode: Literal["fixed", "roll"] | None = None
    hp_amount: int | None = None
    ability_id: str | None = None


class BossDeathRequest(BaseModel):
    choice: Literal["blaze", "risk"]


# -- Responses --


class PendingAction(BaseModel):
    action_type: str
    dice_count: int
    dice_type: DiceType
    purpose: str
    tool_call_id: str
    stat: str | None = None
    modifier: int | None = None
    dc: int | None = None
    vs_label: str | None = None
    adv_type: Literal["norm", "adv", "dis"] | None = None
    adv_reason: str | None = None
    success_text: str | None = None
    fail_text: str | None = None
    footer: str | None = None


class RollResultPayload(BaseModel):
    """Structured roll breakdown (G2)."""

    prompt_id: str | None = None
    label: str
    stat: str | None = None
    nat: int
    die_a: int
    die_b: int | None = None
    total: int
    modifier: int
    adv_used: Literal["norm", "adv", "dis"] = "norm"
    crit: bool = False
    fumble: bool = False
    pass_: bool | None = Field(default=None, alias="pass")
    vs: int | None = None
    dc: int | None = None

    model_config = {"populate_by_name": True}


class GameStateSnapshot(BaseModel):
    character: CharacterState | None = None
    enemies: dict[str, EnemyState] = Field(default_factory=dict)
    countdowns: dict[str, int] = Field(default_factory=dict)
    in_combat: bool = False
    boss_encounter: bool = False
    chapter: int = 1
    scene_label: str = "Road to Phandalin"
    time_current: int = 12
    time_max: int = 50
    campaign_title: str = "Lost Mine of Phandelver"
    pending_level_up: bool = False


class TurnResponse(BaseModel):
    status: str  # "complete" | "pending_action"
    narrations: list[str] = Field(default_factory=list)
    pending_action: PendingAction | None = None
    game_state: GameStateSnapshot
    internal_notes: str | None = None
    roll_result: RollResultPayload | None = None


class CreateSessionResponse(BaseModel):
    session_id: str
    character_name: str
    game_state: GameStateSnapshot


class MessageEntry(BaseModel):
    role: str
    content: str
    timestamp: str | None = None


class TranscriptEntry(BaseModel):
    """Hydrated transcript row (G10)."""

    kind: Literal[
        "scene",
        "message",
        "roll_prompt",
        "roll_result",
        "rest",
        "item",
    ]
    id: str
    timestamp: float
    role: str | None = None
    content: str | None = None
    text: str | None = None
    pending_action: PendingAction | None = None
    roll_result: RollResultPayload | None = None


class MessagesResponse(BaseModel):
    messages: list[MessageEntry] = Field(default_factory=list)
    transcript: list[TranscriptEntry] = Field(default_factory=list)


class CampaignSummary(BaseModel):
    id: str
    name: str
    chapter: int = 1
    time_current: int = 12
    time_max: int = 50
    last_scene: str = ""
    character_name: str = ""
    character_class: str = ""
    level: int = 1
    pending_level_up: bool = False
    active: bool = False


class CampaignListResponse(BaseModel):
    campaigns: list[CampaignSummary]
