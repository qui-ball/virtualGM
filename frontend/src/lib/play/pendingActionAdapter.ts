import { statToShort, type StatKey } from '@/lib/play/stats';
import type { AdvType, RollPromptFields } from '@/lib/play/transcript';
import { createEntryId } from '@/lib/play/transcript';
import type { CharacterState, PendingAction } from '@/types';

const STAT_HINTS: { pattern: RegExp; key: StatKey }[] = [
  { pattern: /\bmight\b|\bmig\b/i, key: 'might' },
  { pattern: /\bfinesse\b|\bfin\b/i, key: 'finesse' },
  { pattern: /\bwit\b/i, key: 'wit' },
  { pattern: /\bpresence\b|\bpre\b/i, key: 'presence' },
];

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

function inferStat(
  action: PendingAction,
  character: CharacterState | null,
): StatKey | undefined {
  if (action.stat) {
    const key = normalizeStatKey(action.stat);
    if (key) return key;
  }
  const haystack = `${action.purpose} ${action.action_type}`;
  for (const { pattern, key } of STAT_HINTS) {
    if (pattern.test(haystack)) {
      return key;
    }
  }
  if (character) {
    if (/attack|weapon|strike|hit/i.test(haystack)) return 'might';
    if (/save|resist/i.test(haystack)) return 'presence';
    if (/check|trick|arcane|spell/i.test(haystack)) return 'wit';
  }
  return undefined;
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

function hasApiEnrichment(action: PendingAction): boolean {
  return (
    action.modifier != null ||
    action.stat != null ||
    action.dc != null ||
    action.vs_label != null ||
    action.adv_type != null
  );
}

export function pendingActionToRollPrompt(
  action: PendingAction,
  character: CharacterState | null,
  promptId: string = createEntryId(),
): RollPromptFields {
  const statKey = inferStat(action, character);
  const statShort = statKey ? statToShort(statKey) : undefined;
  const modifier =
    action.modifier ??
    (statKey && character ? character.stats[statKey] : 0);
  const dc = action.dc ?? 13;
  const stubEnriched = !hasApiEnrichment(action);

  return {
    id: promptId,
    label: action.purpose || action.action_type || 'Roll',
    source: `${action.dice_count}${action.dice_type}${action.action_type !== action.purpose ? ` · ${action.action_type}` : ''}`,
    stat: statShort,
    modifier,
    dc,
    vs: dc,
    vsLabel: action.vs_label ?? `DC ${dc}`,
    advType: parseAdvType(action.adv_type),
    advReason: action.adv_reason,
    footer:
      action.footer ??
      (action.dice_type === 'd20' ? 'crit on nat-20' : undefined),
    successText: action.success_text,
    failText: action.fail_text,
    stubEnriched,
  };
}
