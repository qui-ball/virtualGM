import { classMonogram } from '@/lib/play/portraitPlaceholder';
import type { CharacterState, EnemyState } from '@/types';

export type CombatantKind = 'pc' | 'enemy' | 'unknown';

export type InitiativeSlot = {
  name: string;
  /** Index in the raw initiative_order array. */
  orderIndex: number;
  active: boolean;
  /** Already acted this round — shown at the far right of the queue. */
  acted: boolean;
  kind: CombatantKind;
  /** Short monogram painted on the thumbnail until real art ships. */
  monogram: string;
};

function clampTurnIndex(order: string[], currentTurnIndex: number): number {
  if (order.length === 0) return 0;
  return Math.min(Math.max(0, currentTurnIndex), order.length - 1);
}

export function activeCombatantName(
  initiativeOrder: string[],
  currentTurnIndex: number,
): string {
  if (initiativeOrder.length === 0) return '';
  return initiativeOrder[clampTurnIndex(initiativeOrder, currentTurnIndex)] ?? '';
}

export function turnIndicatorLabel(
  initiativeOrder: string[],
  currentTurnIndex: number,
): string {
  const name = activeCombatantName(initiativeOrder, currentTurnIndex);
  return name ? `${name}'s turn` : '';
}

/**
 * Tactics-style queue: current combatant first, then upcoming, then those who
 * already acted this round at the far right (ready to cycle back in).
 */
export function displayInitiativeOrder(
  initiativeOrder: string[],
  currentTurnIndex: number,
): string[] {
  if (initiativeOrder.length === 0) return [];
  const idx = clampTurnIndex(initiativeOrder, currentTurnIndex);
  return [
    ...initiativeOrder.slice(idx),
    ...initiativeOrder.slice(0, idx),
  ];
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

export function combatantKind(
  displayName: string,
  character: CharacterState | null,
  enemies: Record<string, EnemyState>,
): CombatantKind {
  if (isPlayerCombatant(displayName, character)) return 'pc';
  if (matchEnemyByInitiativeName(enemies, displayName)) return 'enemy';
  return 'unknown';
}

/** Thumbnail monogram: class initial for the PC, compact enemy label otherwise. */
export function combatantPortraitMonogram(
  displayName: string,
  character: CharacterState | null,
): string {
  if (isPlayerCombatant(displayName, character) && character) {
    return classMonogram(character.character_class);
  }
  const parts = displayName.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return '?';
  const last = parts[parts.length - 1] ?? '';
  if (parts.length >= 2 && /^\d+$/.test(last)) {
    return `${parts[0]!.charAt(0)}${last}`.toUpperCase();
  }
  if (parts.length >= 2) {
    return `${parts[0]!.charAt(0)}${parts[1]!.charAt(0)}`.toUpperCase();
  }
  return parts[0]!.slice(0, 2).toUpperCase();
}

/** Build the portrait-row model for the HUD. */
export function buildInitiativeSlots(
  initiativeOrder: string[],
  currentTurnIndex: number,
  character: CharacterState | null,
  enemies: Record<string, EnemyState>,
): InitiativeSlot[] {
  const idx = clampTurnIndex(initiativeOrder, currentTurnIndex);
  return displayInitiativeOrder(initiativeOrder, currentTurnIndex).map(
    (name) => {
      const orderIndex = initiativeOrder.indexOf(name);
      return {
        name,
        orderIndex,
        active: orderIndex === idx,
        acted: orderIndex < idx,
        kind: combatantKind(name, character, enemies),
        monogram: combatantPortraitMonogram(name, character),
      };
    },
  );
}
