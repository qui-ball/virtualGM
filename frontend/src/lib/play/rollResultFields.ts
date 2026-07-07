import { createEntryId, type RollResultFields } from '@/lib/play/transcript';
import type { RollDiceResult } from '@/lib/play/roll';

/** Build transcript roll-result fields from a client dice roll. */
export function rollDiceToResultFields(
  roll: RollDiceResult,
  promptId: string,
  label: string,
  opts?: { stat?: string; vs?: number | null },
): RollResultFields {
  return {
    id: createEntryId(),
    promptId,
    label,
    diceCount: roll.diceCount,
    diceType: roll.diceType,
    rolls: roll.rolls,
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

/** @deprecated Use rollDiceToResultFields */
export function rollD20ToResultFields(
  roll: RollDiceResult,
  promptId: string,
  label: string,
  opts?: { stat?: string; vs?: number | null },
): RollResultFields {
  return rollDiceToResultFields(roll, promptId, label, opts);
}
