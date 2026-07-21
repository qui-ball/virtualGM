import { isD20Roll } from '@/lib/play/rollFormula';
import { statToShort, type StatKey } from '@/lib/play/stats';
import type { AdvType, RollPromptFields } from '@/lib/play/transcript';
import { createEntryId } from '@/lib/play/transcript';
import type { CharacterState, PendingAction } from '@/types';

const SHORT_TO_STAT: Record<string, StatKey> = {
  mig: 'might',
  fin: 'finesse',
  wit: 'wit',
  pre: 'presence',
};

function normalizeStatKey(value: string): StatKey | undefined {
  const lower = value.toLowerCase();
  if (isStatKey(lower)) return lower;
  return SHORT_TO_STAT[lower];
}

function isStatKey(value: string): value is StatKey {
  return ['might', 'finesse', 'wit', 'presence'].includes(value);
}

function parseAdvType(value: string | undefined): AdvType {
  if (value === 'adv' || value === 'dis' || value === 'norm') {
    return value;
  }
  return 'norm';
}

/** True when the server did not send fields the GM should provide for a d20 check. */
function isIncompleteGmRoll(action: PendingAction): boolean {
  const isD20Check =
    action.dice_type === 'd20' && action.dice_count === 1;
  if (!isD20Check) return false;
  return action.dc == null && action.vs_label == null;
}

/**
 * Map server `PendingAction` → roll card fields.
 * The backend/GM is the source of truth — no DC, stat, or die inference here.
 */
export function pendingActionToRollPrompt(
  action: PendingAction,
  _character: CharacterState | null,
  promptId: string = createEntryId(),
): RollPromptFields {
  const diceCount = action.dice_count;
  const diceType = action.dice_type;
  const isD20 = isD20Roll(diceType);
  const statKey = action.stat ? normalizeStatKey(action.stat) : undefined;
  const statShort = statKey ? statToShort(statKey) : action.stat;

  return {
    id: promptId,
    label: action.purpose || action.action_type || 'Roll',
    diceCount,
    diceType,
    source: `${diceCount}${diceType}${action.action_type !== action.purpose ? ` · ${action.action_type}` : ''}`,
    stat: statShort,
    modifier: action.modifier ?? 0,
    dc: action.dc,
    vs: action.dc,
    vsLabel: action.vs_label,
    advType: isD20 ? parseAdvType(action.adv_type) : 'norm',
    advReason: isD20 ? action.adv_reason : undefined,
    footer: action.footer,
    successText: action.success_text,
    failText: action.fail_text,
    stubEnriched: isIncompleteGmRoll(action),
  };
}

/** Target number for pass/fail on a d20 roll — server-provided only. */
export function rollTargetFromPendingAction(
  action: PendingAction,
): number | null {
  if (action.dice_type !== 'd20' || action.dice_count !== 1) {
    return null;
  }
  return action.dc ?? null;
}
