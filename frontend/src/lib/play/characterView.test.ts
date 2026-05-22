import { describe, expect, it } from 'vitest';
import { DEMO_CHARACTER, toCharacterView } from '@/lib/play/characterView';
import type { CharacterState } from '@/types';

const WARRIOR: CharacterState = {
  name: 'Aldric of Corlinn Hill',
  character_class: 'warrior',
  level: 1,
  xp: 0,
  stats: { might: 2, finesse: 1, wit: 0, presence: -1 },
  hp: 12,
  hp_max: 12,
  evasion: 14,
  mana: null,
  mana_max: null,
  conditions: [],
  class_abilities: ['weapon_focus'],
  spells_known: [],
  gold: 10,
  inventory: ['Longsword'],
  equipped_weapon: 'Longsword',
  equipped_armor: 'Chain Mail',
};

describe('toCharacterView', () => {
  it('maps warrior without mana UI', () => {
    const view = toCharacterView(WARRIOR);
    expect(view.showMana).toBe(false);
    expect(view.mana).toBeNull();
    expect(view.classLabel).toBe('Warrior');
    expect(view.pendingLevelUp).toBe(false);
  });

  it('maps mage with mana and pending level-up when XP threshold met', () => {
    const view = toCharacterView(DEMO_CHARACTER);
    expect(view.showMana).toBe(true);
    expect(view.mana).toBe(6);
    expect(view.manaMax).toBe(9);
    expect(view.pendingLevelUp).toBe(false);
    expect(view.xpNext).toBe(1_000);
  });

  it('uses display labels and short codes for stats', () => {
    const view = toCharacterView(DEMO_CHARACTER);
    expect(view.stats.map((s) => s.label)).toEqual([
      'MIGHT',
      'FINESSE',
      'WIT',
      'PRESENCE',
    ]);
    expect(view.stats.map((s) => s.short)).toEqual([
      'Mig',
      'Fin',
      'Wit',
      'Pre',
    ]);
    expect(view.initiativeMod).toBe(0);
    expect(view.stats.find((s) => s.key === 'wit')?.ariaLabel).toContain('Wit');
  });

  it('exposes showMana for casters only (WS-5 PlusMenu)', () => {
    const mage = toCharacterView(DEMO_CHARACTER);
    expect(mage.showMana).toBe(true);

    const warrior = toCharacterView({ ...DEMO_CHARACTER, character_class: 'warrior', mana: null, mana_max: null });
    expect(warrior.showMana).toBe(false);
  });

  it('formats condition labels', () => {
    const frightened: CharacterState = {
      ...WARRIOR,
      conditions: ['frightened'],
    };
    expect(toCharacterView(frightened).conditions[0].label).toBe('Frightened');
  });
});
