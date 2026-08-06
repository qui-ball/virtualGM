import type { GameStateSnapshot } from '@/types';

export type SessionContextView = {
  campaignTitle: string;
  chapter: number;
  scene: string;
  timeCurrent: number;
  timeMax: number;
};

/** Countdown names that represent the campaign clock in the app bar. */
const CLOCK_COUNTDOWN_RE = /time|hour|hours|clock|deadline|daylight|\bdays?\b/i;

/**
 * Resolve remaining campaign time for the app bar.
 * Prefers a live clock-like countdown (what the GM usually ticks), then time_current.
 */
export function resolveCampaignTimeCurrent(
  gameState: GameStateSnapshot | null | undefined,
): number {
  const countdowns = Object.entries(gameState?.countdowns ?? {});
  const named = countdowns.find(([name]) => CLOCK_COUNTDOWN_RE.test(name));
  if (named) {
    return Math.max(0, named[1]);
  }

  // Single anonymous countdown under the campaign max often IS the clock.
  if (countdowns.length === 1) {
    const value = countdowns[0][1];
    const max = gameState?.time_max ?? 50;
    const stored = gameState?.time_current;
    if (
      typeof value === 'number' &&
      value >= 0 &&
      value <= max &&
      (stored == null || stored === max || value < stored)
    ) {
      return value;
    }
  }

  return gameState?.time_current ?? 12;
}

/** Map API game_state campaign fields (G4). */
export function toSessionContext(
  gameState: GameStateSnapshot | null,
): SessionContextView {
  return {
    campaignTitle:
      gameState?.campaign_title ?? 'Lost Mine of Phandelver',
    chapter: gameState?.chapter ?? 1,
    scene:
      gameState?.scene_label ??
      (gameState?.in_combat ? 'Combat' : 'Road to Phandalin'),
    timeCurrent: resolveCampaignTimeCurrent(gameState),
    timeMax: gameState?.time_max ?? 50,
  };
}
