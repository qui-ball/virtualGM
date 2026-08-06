import { describe, expect, it } from 'vitest';
import { DEMO_CHARACTER } from '@/lib/play/characterView';
import {
  activeCombatantName,
  buildInitiativeSlots,
  combatantPortraitMonogram,
  displayInitiativeOrder,
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

  it('rotates the queue so the current combatant leads', () => {
    expect(displayInitiativeOrder(ORDER, 0)).toEqual(ORDER);
    expect(displayInitiativeOrder(ORDER, 1)).toEqual([
      'Goblin 1',
      'Goblin 2',
      'Aldric',
    ]);
    expect(displayInitiativeOrder(ORDER, 2)).toEqual([
      'Goblin 2',
      'Aldric',
      'Goblin 1',
    ]);
  });

  it('marks acted combatants when building portrait slots', () => {
    const slots = buildInitiativeSlots(ORDER, 1, DEMO_CHARACTER, {
      'Goblin 1': {
        name: 'Goblin 1',
        hp: 4,
        hp_max: 6,
        evasion: 12,
        attack_modifier: 2,
        damage: '1d6',
        conditions: [],
      },
      'Goblin 2': {
        name: 'Goblin 2',
        hp: 5,
        hp_max: 6,
        evasion: 12,
        attack_modifier: 2,
        damage: '1d6',
        conditions: [],
      },
    });

    expect(slots.map((s) => s.name)).toEqual([
      'Goblin 1',
      'Goblin 2',
      'Aldric',
    ]);
    expect(slots[0]).toMatchObject({ active: true, acted: false, kind: 'enemy' });
    expect(slots[1]).toMatchObject({ active: false, acted: false, kind: 'enemy' });
    expect(slots[2]).toMatchObject({
      active: false,
      acted: true,
      kind: 'unknown',
    });
  });

  it('builds class monograms for the PC and compact labels for numbered enemies', () => {
    expect(combatantPortraitMonogram(DEMO_CHARACTER.name, DEMO_CHARACTER)).toBe(
      'M',
    );
    expect(combatantPortraitMonogram('Goblin 1', null)).toBe('G1');
    expect(combatantPortraitMonogram('Wolf', null)).toBe('WO');
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
