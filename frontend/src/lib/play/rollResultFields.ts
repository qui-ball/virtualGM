import { createEntryId, type RollResultFields } from '@/lib/play/transcript';
import type { RollD20Result } from '@/lib/play/roll';

/** Build transcript roll-result fields from a client d20 roll. */
export function rollD20ToResultFields(
  roll: RollD20Result,
  promptId: string,
  label: string,
  opts?: { stat?: string; vs?: number | null },
): RollResultFields {
  return {
    id: createEntryId(),
    promptId,
    label,
    stat: opts?.stat,
    nat: roll.nat,
    dieA: roll.dieA,
    dieB: roll.dieB,
    total: roll.total,
    modifier: roll.modifier,
    advUsed: roll.advUsed,
    crit: roll.crit,
    fumble: roll.fumble,
    pass: roll.pass,
    vs: opts?.vs ?? undefined,
    dc: opts?.vs ?? undefined,
  };
}
