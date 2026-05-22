import type { StatKey } from '@/lib/play/stats';

/** UI chip labels (StatModifierRow, save chips). */
export const STAT_DISPLAY_LABELS: Record<StatKey, string> = {
  might: 'MIGHT',
  finesse: 'FINESSE',
  wit: 'WIT',
  presence: 'PRESENCE',
};

export function statDisplayLabel(key: StatKey): string {
  return STAT_DISPLAY_LABELS[key];
}
