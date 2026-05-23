"""Non-turn player actions: rest, item, cast, boss death (G5, G6, G8)."""

import random

from api.schemas import CastSpellRequest, RollResultPayload
from api.dice import roll_d20
from api.transcript_log import append_item, append_message, append_rest, append_roll_result
from game.models import GameState
from game.session import Session


def apply_short_rest(gs: GameState) -> str:
    if gs.pc is None:
        return "No character"
    gs.pc.hp = min(gs.pc.hp_max, gs.pc.hp + max(1, gs.pc.hp_max // 2))
    if gs.pc.mana_max is not None and gs.pc.mana is not None:
        gs.pc.mana = min(gs.pc.mana_max, gs.pc.mana + 2)
    if gs.time_current is not None:
        gs.time_current = max(0, gs.time_current - 1)
    return "Short rest · +HP · time −1"


def apply_long_rest(gs: GameState) -> str:
    if gs.pc is None:
        return "No character"
    gs.pc.hp = gs.pc.hp_max
    if gs.pc.mana_max is not None:
        gs.pc.mana = gs.pc.mana_max
    gs.in_combat = False
    gs.is_boss_battle = False
    if gs.time_current is not None:
        gs.time_current = max(0, gs.time_current - 5)
    return "Long rest · HP & MP full · time −5"


def apply_use_item(gs: GameState, item_name: str) -> str:
    if gs.pc is None:
        return "No character"
    if item_name not in gs.pc.inventory:
        return f"Item '{item_name}' not in inventory"
    return f"Item used · {item_name}"


def apply_cast_spell(
    session: Session,
    cast: CastSpellRequest,
) -> RollResultPayload | None:
    gs = session.game_state
    if gs.pc is None:
        return None

    spell = next((s for s in gs.pc.spells if s.id == cast.spell_id), None)
    label = spell.name if spell else cast.spell_id

    if gs.pc.mana is None:
        raise ValueError("Character cannot cast spells")
    if gs.pc.mana < cast.mp_cost:
        raise ValueError("Not enough MP")

    gs.pc.mana -= cast.mp_cost

    wit_mod = gs.pc.stats.wit
    rolled = roll_d20(adv="norm", modifier=wit_mod, vs=13)
    payload = RollResultPayload(
        label=label,
        stat="Wit",
        nat=rolled["nat"],
        die_a=rolled["die_a"],
        die_b=rolled["die_b"],
        total=rolled["total"],
        modifier=rolled["modifier"],
        adv_used="norm",
        crit=rolled["crit"],
        fumble=rolled["fumble"],
        pass_=rolled["pass"],
        vs=13,
    )
    append_roll_result(session, payload)
    return payload


def apply_boss_death(gs: GameState, choice: str) -> str:
    if gs.pc is None:
        return "No character"
    name = gs.pc.name

    if choice == "blaze":
        gs.pc.hp = 0
        gs.in_combat = False
        gs.is_boss_battle = False
        return (
            f"{name} unleashes Blaze of Glory — one auto-crit action, then falls to 0 HP."
        )

    survived = random.random() < 0.5
    if survived:
        gs.pc.hp = max(1, gs.pc.hp_max // 2)
        gs.in_combat = True
        return f"{name} risks it all — survives at {gs.pc.hp} HP (50% roll)."
    gs.pc.hp = 0
    gs.in_combat = False
    gs.is_boss_battle = False
    return f"{name} risks it all — fails and falls to 0 HP."


def handle_player_action(
    session: Session,
    *,
    rest_type: str | None = None,
    use_item: str | None = None,
    cast_spell: CastSpellRequest | None = None,
) -> tuple[str | None, RollResultPayload | None]:
    gs = session.game_state
    roll_payload: RollResultPayload | None = None

    if rest_type == "short":
        text = apply_short_rest(gs)
        append_rest(session, text)
        return text, None
    if rest_type == "long":
        text = apply_long_rest(gs)
        append_rest(session, text)
        return text, None
    if use_item:
        text = apply_use_item(gs, use_item)
        append_item(session, text)
        return text, None
    if cast_spell:
        roll_payload = apply_cast_spell(session, cast_spell)
        return f"Cast · {cast_spell.spell_id}", roll_payload

    return None, None
