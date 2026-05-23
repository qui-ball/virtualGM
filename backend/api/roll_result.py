"""Build RollResultPayload from pending action + player rolls (G2)."""

from api.dice import resolve_d20_from_rolls
from api.schemas import ActionResponse, PendingAction, RollResultPayload


def build_roll_result_payload(
    pending: PendingAction,
    action_response: ActionResponse,
    *,
    prompt_id: str | None = None,
) -> RollResultPayload:
    adv = pending.adv_type or "norm"
    modifier = pending.modifier if pending.modifier is not None else 0
    vs = pending.dc
    rolls = action_response.individual_rolls
    if rolls is None:
        rolls = [action_response.roll_result]

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
