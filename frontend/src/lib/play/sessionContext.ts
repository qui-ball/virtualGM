import type { GameStateSnapshot } from '@/types';

export type SessionContextView = {
  campaignTitle: string;
  chapter: number;
  scene: string;
  timeCurrent: number;
  timeMax: number;
};

/** Stub until G4 API provides chapter, scene, and time on game_state. */
export function toSessionContext(
  gameState: GameStateSnapshot | null,
): SessionContextView {
  const countdownValues = Object.values(gameState?.countdowns ?? {});
  const timeCurrent = countdownValues[0] ?? 12;

  return {
    campaignTitle: 'Lost Mine of Phandelver',
    chapter: 1,
    scene: gameState?.in_combat ? 'Combat' : 'Road to Phandalin',
    timeCurrent,
    timeMax: 50,
  };
}
