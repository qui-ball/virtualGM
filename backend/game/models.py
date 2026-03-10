"""Game state models, type aliases, and dice constants."""

import asyncio
from typing import Literal

from pydantic import BaseModel, Field

# =============================================================================
# Dice System
# =============================================================================

DiceType = Literal["d4", "d6", "d8", "d10", "d12", "d20", "d100"]

XP_THRESHOLDS: dict[int, int] = {
    2: 100,
    3: 250,
    4: 500,
    5: 1_000,
    6: 2_000,
    7: 4_000,
    8: 7_000,
    9: 11_000,
    10: 16_000,
}

DICE_SIDES: dict[DiceType, int] = {
    "d4": 4,
    "d6": 6,
    "d8": 8,
    "d10": 10,
    "d12": 12,
    "d20": 20,
    "d100": 100,
}


# =============================================================================
# State Models
# =============================================================================

StatName = Literal["might", "finesse", "wit", "presence"]
ClassName = Literal["warrior", "mage", "ranger", "bard"]
ConditionName = Literal["poisoned", "stunned", "frightened", "restrained", "prone"]

# Hit dice by class
CLASS_HIT_DICE: dict[ClassName, DiceType] = {
    "warrior": "d10",
    "mage": "d6",
    "ranger": "d8",
    "bard": "d8",
}


class Stats(BaseModel):
    """Character stats with modifiers."""

    might: int = Field(default=0, ge=-5, le=5, description="Physical power, endurance")
    finesse: int = Field(
        default=0, ge=-5, le=5, description="Coordination, dexterity, stealth"
    )
    wit: int = Field(
        default=0, ge=-5, le=5, description="Perception, smarts, investigation"
    )
    presence: int = Field(
        default=0, ge=-5, le=5, description="Charisma, charm, personality"
    )


class CharacterState(BaseModel):
    """Player character state."""

    name: str = Field(description="Character name")
    character_class: ClassName = Field(description="Character class")
    level: int = Field(default=1, ge=1, le=10, description="Character level")
    xp: int = Field(default=0, ge=0, description="Total experience points")

    # Core stats
    stats: Stats = Field(default_factory=Stats)

    # Combat stats
    hp: int = Field(description="Current hit points")
    hp_max: int = Field(description="Maximum hit points")
    evasion: int = Field(description="Evasion (target number to be hit)")

    # Magic (for Mage/Bard)
    mana: int | None = Field(default=None, description="Current mana (casters only)")
    mana_max: int | None = Field(
        default=None, description="Maximum mana (casters only)"
    )

    # Conditions
    conditions: list[ConditionName] = Field(
        default_factory=list, description="Active conditions"
    )

    # Progression
    class_abilities: list[str] = Field(
        default_factory=list, description="Chosen class ability IDs"
    )
    spells_known: list[str] = Field(
        default_factory=list, description="Known spell names (casters only)"
    )

    # Equipment & economy
    gold: int = Field(default=10, ge=0, description="Gold pieces")
    inventory: list[str] = Field(default_factory=list, description="Items carried")
    equipped_weapon: str | None = Field(
        default=None, description="Currently equipped weapon"
    )
    equipped_armor: str | None = Field(
        default=None, description="Currently equipped armor"
    )


class EnemyState(BaseModel):
    """Enemy/adversary state."""

    name: str = Field(description="Enemy name/identifier")
    hp: int = Field(description="Current hit points")
    hp_max: int = Field(description="Maximum hit points")
    evasion: int = Field(description="Evasion (target number to hit)")
    attack_modifier: int = Field(default=0, description="Modifier to attack rolls")
    damage: str = Field(default="1d6", description="Damage expression (e.g., '1d6+2')")
    conditions: list[ConditionName] = Field(
        default_factory=list, description="Active conditions"
    )


class GameState:
    """Mutable game state shared across tool calls."""

    def __init__(self):
        # Player character (single player)
        self.pc: CharacterState | None = None

        # Enemies in current encounter
        self.enemies: dict[str, EnemyState] = {}

        # Campaign tracking
        self.time_counter: int | None = None  # Chapter time counter
        self.countdowns: dict[str, int] = {}  # Named countdowns

        # Combat state
        self.in_combat: bool = False
        self.is_boss_battle: bool = False
        self.initiative_order: list[str] = []  # Names in initiative order
        self.current_turn_index: int = 0

        # Campaign context management
        self.campaign_dir: str | None = None  # Path to campaign directory
        self.loaded_sections: dict[str, str] = {}  # section_path -> content
        self.max_loaded_sections: int = 3

        # Narration collection for API mode
        self.narrations: list[str] = []

        # SSE event queue — set by turn_engine during streaming
        self._event_queue: asyncio.Queue | None = None


class EndGameMasterTurn(BaseModel):
    """Signals the end of the GM's turn."""

    internal_notes: str | None = None


def create_player_character() -> CharacterState:
    """Create a pre-generated warrior for Lost Mine of Phandelver.

    Human Fighter — a noble heir from Corlinn Hill seeking to civilize Phandalin.
    """
    return CharacterState(
        name="Aldric of Corlinn Hill",
        character_class="warrior",
        level=1,
        xp=0,
        stats=Stats(might=2, finesse=1, wit=0, presence=-1),
        hp=12,  # 10 + 2 (Might)
        hp_max=12,
        evasion=14,  # 10 + 1 (Finesse) + 3 (Chain Mail)
        class_abilities=["weapon_focus"],  # WAR-S1: +1 to melee attack rolls
        gold=10,
        inventory=["Longsword", "Handaxe", "Chain Mail", "Explorer's Pack"],
        equipped_weapon="Longsword",
        equipped_armor="Chain Mail",
    )
