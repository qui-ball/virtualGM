import type { CharacterState, GameStateSnapshot } from '@/types';

/** Boss zero-state overlay (stub until API G8). */
export function isBossZeroState(gameState: GameStateSnapshot | null): boolean {
  const pc = gameState?.character;
  if (!pc) return false;
  return (
    pc.hp <= 0 &&
    !!gameState.in_combat &&
    !!gameState.boss_encounter
  );
}

/** Non-boss HP=0 auto-recovers full HP/MP per wireframe. */
export function shouldNonBossAutoRecover(
  gameState: GameStateSnapshot | null,
): boolean {
  const pc = gameState?.character;
  if (!pc) return false;
  return (
    pc.hp <= 0 &&
    !!gameState.in_combat &&
    !gameState.boss_encounter
  );
}

export function applyNonBossAutoRecover(
  character: CharacterState,
): CharacterState {
  return {
    ...character,
    hp: character.hp_max,
    mana:
      character.mana_max != null ? character.mana_max : character.mana,
  };
}

export type RiskItAllResult = {
  nat: number;
  survived: boolean;
  hp: number;
};

/** d20; nat 20 → 5 HP and continue, else death. */
export function rollRiskItAll(
  random: () => number = Math.random,
): RiskItAllResult {
  const nat = 1 + Math.floor(random() * 20);
  if (nat === 20) {
    return { nat, survived: true, hp: 5 };
  }
  return { nat, survived: false, hp: 0 };
}

export function blazeOfGloryCopy(characterName: string): string {
  return `${characterName} takes one final action — every attack is an automatic critical hit — then falls.`;
}

export function riskItAllCopy(result: RiskItAllResult): string {
  if (result.survived) {
    return `Nat ${result.nat}! You cling to life with 5 HP.`;
  }
  return `Rolled ${result.nat}. The darkness takes you.`;
}
