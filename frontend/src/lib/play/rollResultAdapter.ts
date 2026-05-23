import { createEntryId } from '@/lib/play/transcript';
import type { RollResultFields } from '@/lib/play/transcript';
import type { RollResultPayload } from '@/types';

/** Map API roll_result payload → transcript RollResultFields (G2). */
export function rollResultPayloadToFields(
  payload: RollResultPayload,
  promptId: string = createEntryId(),
): RollResultFields {
  return {
    id: createEntryId(),
    promptId: payload.prompt_id ?? promptId,
    label: payload.label,
    stat: payload.stat ?? undefined,
    nat: payload.nat,
    dieA: payload.die_a,
    dieB: payload.die_b ?? undefined,
    total: payload.total,
    modifier: payload.modifier,
    advUsed: payload.adv_used,
    crit: payload.crit,
    fumble: payload.fumble,
    pass: payload.pass ?? null,
    vs: payload.vs ?? undefined,
    dc: payload.dc ?? undefined,
  };
}
