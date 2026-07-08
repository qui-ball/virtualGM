"""Build RollResultPayload from pending action + player rolls (G2)."""

from api.dice import resolve_d20_from_rolls, resolve_dice_from_rolls
from api.schemas import ActionResponse, PendingAction, RollResultPayload


def build_roll_result_payload(
    pending: PendingAction,
    action_response: ActionResponse,
    *,
    prompt_id: str | None = None,
) -> RollResultPayload:
    modifier = pending.modifier if pending.modifier is not None else 0
    rolls = action_response.individual_rolls
    if rolls is None:
        rolls = [action_response.roll_result]

    if pending.dice_type == "d20" and pending.dice_count == 1:
        adv = pending.adv_type or "norm"
        vs = pending.dc
        rolled = resolve_d20_from_rolls(
            rolls,
            adv=adv,  # type: ignore[arg-type]
            modifier=modifier,
            vs=vs,
        )
        return RollResultPayload(
            prompt_id=prompt_id,
            label=pending.purpose or pending.action_type,
            stat=pending.stat,
            dice_type=pending.dice_type,
            dice_count=pending.dice_count,
            rolls=rolls[:2] if adv != "norm" and len(rolls) >= 2 else rolls[:1],
            nat=rolled["nat"],
            die_a=rolled["die_a"],
            die_b=rolled["die_b"],
            total=rolled["total"],
            modifier=rolled["modifier"],
            adv_used=rolled["adv_used"],  # type: ignore[arg-type]
            crit=rolled["crit"],
            fumble=rolled["fumble"],
            pass_=rolled["pass"],
            vs=vs,
            dc=pending.dc,
            vs_label=pending.vs_label,
        )

    rolled = resolve_dice_from_rolls(
        rolls,
        dice_count=pending.dice_count,
        dice_type=pending.dice_type,
        modifier=modifier,
    )
    return RollResultPayload(
        prompt_id=prompt_id,
        label=pending.purpose or pending.action_type,
        stat=pending.stat,
        dice_type=pending.dice_type,
        dice_count=pending.dice_count,
        rolls=rolled["rolls"],
        nat=rolled["nat"],
        die_a=rolled["die_a"],
        die_b=rolled["die_b"],
        total=rolled["total"],
        modifier=rolled["modifier"],
        adv_used="norm",
        crit=False,
        fumble=False,
        pass_=None,
        vs=None,
        dc=None,
    )


def format_roll_result_for_agent(
    pending: PendingAction,
    payload: RollResultPayload,
) -> str:
    """Authoritative roll summary for the GM — includes modifier, target, and outcome."""
    label = pending.purpose or pending.action_type
    dice_type = pending.dice_type
    dice_count = pending.dice_count

    if dice_type == "d20" and dice_count == 1:
        stat = pending.stat or ""
        mod_part = (
            f" + {payload.modifier} ({stat})"
            if payload.modifier and stat
            else (f" + {payload.modifier}" if payload.modifier else "")
        )
        line = f"🎲 {label}: nat {payload.nat}{mod_part} = {payload.total}"

        if payload.dc is not None:
            outcome = "SUCCESS" if payload.pass_ else "FAILURE"
            line += f" vs DC {payload.dc} → {outcome}"
        elif payload.vs is not None:
            outcome = "HIT" if payload.pass_ else "MISS"
            line += f" vs {payload.vs} → {outcome}"

        if payload.crit:
            line += " (NATURAL 20 — CRITICAL!)"
        elif payload.fumble:
            line += " (NATURAL 1 — FUMBLE!)"

        return line

    rolls = payload.rolls or [payload.die_a]
    mod = payload.modifier
    mod_suffix = f" + {mod} = {payload.total}" if mod else f" = {payload.total}"
    if dice_count == 1:
        return f"🎲 [{dice_count}{dice_type}] → {rolls[0]}{mod_suffix}"
    return f"🎲 [{dice_count}{dice_type}] → {rolls}{mod_suffix}"
