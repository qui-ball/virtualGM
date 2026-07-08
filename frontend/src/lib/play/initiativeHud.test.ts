import { describe, expect, it } from 'vitest';
import { DEMO_CHARACTER } from '@/lib/play/characterView';
import {
  activeCombatantName,
  isPlayerCombatant,
  matchEnemyByInitiativeName,
  turnIndicatorLabel,
} from '@/lib/play/initiativeHud';
import type { EnemyState } from '@/types';

const ORDER = ['Aldric', 'Goblin 1', 'Goblin 2'];

describe('initiativeHud', () => {
  it('labels the active turn', () => {
    expect(activeCombatantName(ORDER, 1)).toBe('Goblin 1');
    expect(turnIndicatorLabel(ORDER, 1)).toBe("Goblin 1's turn");
  });

  it('clamps out-of-range turn index', () => {
    expect(activeCombatantName(ORDER, 99)).toBe('Goblin 2');
    expect(activeCombatantName(ORDER, -3)).toBe('Aldric');
  });

  it('matches enemies by map key or display name', () => {
    const enemy: EnemyState = {
      name: 'Goblin 1',
      hp: 4,
      hp_max: 6,
      evasion: 12,
      attack_modifier: 2,
      damage: '1d6',
      conditions: [],
    };
    expect(matchEnemyByInitiativeName({ goblin_1: enemy }, 'Goblin 1')).toBe(
      enemy,
    );
    expect(matchEnemyByInitiativeName({ 'Goblin 1': enemy }, 'Goblin 1')).toBe(
      enemy,
    );
  });

  it('detects player combatants by character name', () => {
    expect(isPlayerCombatant(DEMO_CHARACTER.name, DEMO_CHARACTER)).toBe(true);
    expect(isPlayerCombatant('Goblin 1', DEMO_CHARACTER)).toBe(false);
  });
});
