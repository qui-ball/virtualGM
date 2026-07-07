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
