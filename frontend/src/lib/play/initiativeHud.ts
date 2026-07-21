import type { CharacterState, EnemyState } from '@/types';

export function activeCombatantName(
  initiativeOrder: string[],
  currentTurnIndex: number,
): string {
  if (initiativeOrder.length === 0) return '';
  const idx = Math.min(
    Math.max(0, currentTurnIndex),
    initiativeOrder.length - 1,
  );
  return initiativeOrder[idx] ?? '';
}

export function turnIndicatorLabel(
  initiativeOrder: string[],
  currentTurnIndex: number,
): string {
  const name = activeCombatantName(initiativeOrder, currentTurnIndex);
  return name ? `${name}'s turn` : '';
}

export function matchEnemyByInitiativeName(
  enemies: Record<string, EnemyState>,
  displayName: string,
): EnemyState | null {
  if (enemies[displayName]) return enemies[displayName];
  for (const enemy of Object.values(enemies)) {
    if (enemy.name === displayName) return enemy;
  }
  return null;
}

export function isPlayerCombatant(
  displayName: string,
  character: CharacterState | null,
): boolean {
  return !!character && character.name === displayName;
}
