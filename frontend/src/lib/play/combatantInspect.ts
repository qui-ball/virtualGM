import {
  isPlayerCombatant,
  matchEnemyByInitiativeName,
} from '@/lib/play/initiativeHud';
import type { CharacterState, EnemyState } from '@/types';

export type CombatantInspectView =
  | { kind: 'pc'; lines: string[] }
  | { kind: 'enemy'; lines: string[] }
  | { kind: 'unknown' };

/** Build inspect popover lines for initiative chip tap (WS-6.1 / WS-7.1). */
export function buildCombatantInspectView(
  displayName: string,
  character: CharacterState | null,
  enemies: Record<string, EnemyState>,
): CombatantInspectView {
  if (isPlayerCombatant(displayName, character) && character) {
    const lines = [
      `HP ${character.hp}/${character.hp_max}`,
      `Evasion ${character.evasion}`,
    ];
    if (character.mana != null && character.mana_max != null) {
      lines.push(`MP ${character.mana}/${character.mana_max}`);
    }
    lines.push(
      `Conditions ${
        character.conditions.length > 0 ? character.conditions.join(', ') : '—'
      }`,
    );
    return { kind: 'pc', lines };
  }

  const enemy = matchEnemyByInitiativeName(enemies, displayName);
  if (enemy) {
    return {
      kind: 'enemy',
      lines: [
        `HP ${enemy.hp}/${enemy.hp_max}`,
        `Evasion ${enemy.evasion}`,
        `Conditions ${
          enemy.conditions.length > 0 ? enemy.conditions.join(', ') : '—'
        }`,
      ],
    };
  }

  return { kind: 'unknown' };
}
