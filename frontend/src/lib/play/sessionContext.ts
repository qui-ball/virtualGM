import type { GameStateSnapshot } from '@/types';

export type SessionContextView = {
  campaignTitle: string;
  chapter: number;
  scene: string;
  timeCurrent: number;
  timeMax: number;
};

/** Map API game_state campaign fields (G4). */
export function toSessionContext(
  gameState: GameStateSnapshot | null,
): SessionContextView {
  const countdownValues = Object.values(gameState?.countdowns ?? {});
  const timeFromCountdown = countdownValues[0];

  return {
    campaignTitle:
      gameState?.campaign_title ?? 'Lost Mine of Phandelver',
    chapter: gameState?.chapter ?? 1,
    scene:
      gameState?.scene_label ??
      (gameState?.in_combat ? 'Combat' : 'Road to Phandalin'),
    timeCurrent:
      gameState?.time_current ?? timeFromCountdown ?? 12,
    timeMax: gameState?.time_max ?? 50,
  };
}
