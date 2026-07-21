import type { PlusMenuAction } from '@/components/play/PlusMenu';

const BLOCKED_IN_COMBAT: ReadonlySet<PlusMenuAction> = new Set([
  'shortrest',
  'longrest',
  'note',
]);

export function isActionAllowedInCombat(action: PlusMenuAction): boolean {
  return !BLOCKED_IN_COMBAT.has(action);
}

export function combatBlockedReason(action: PlusMenuAction): string | null {
  if (isActionAllowedInCombat(action)) return null;
  return 'Not available during combat';
}
