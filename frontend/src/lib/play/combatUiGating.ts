import type { CombatSplashPhase } from '@/hooks/useCombatMode';

/** Combat splash tracks `in_combat` edges — suppress when boss-death blocks the session. */
export function combatSplashInCombatInput(
  inCombat: boolean,
  bossDeathBlocking: boolean,
): boolean {
  return inCombat && !bossDeathBlocking;
}

/** Initiative HUD + combat strip visibility (wireframe A4b). */
export function combatStripVisible(inCombat: boolean): boolean {
  return inCombat;
}

/** Level-up dialog waits until combat exit splash finishes (WS-6.3 / WS-7.1). */
export function shouldShowLevelUpDialog(
  mustResolveLevelUp: boolean,
  splashPhase: CombatSplashPhase,
): boolean {
  return mustResolveLevelUp && splashPhase === 'idle';
}

/** Z-index layering for modal stack (WS-7.3). Boss death must sit above combat splash. */
export const COMBAT_SPLASH_Z_INDEX = 9990;
export const BOSS_DEATH_Z_INDEX = 10000;
