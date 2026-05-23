import { describe, expect, it, vi } from 'vitest';
import {
  applyNonBossAutoRecover,
  isBossZeroState,
  rollRiskItAll,
  shouldNonBossAutoRecover,
} from '@/lib/play/bossDeath';
import type { GameStateSnapshot } from '@/types';

const base: GameStateSnapshot = {
  character: {
    name: 'Test',
    character_class: 'warrior',
    level: 1,
    xp: 0,
    stats: { might: 0, finesse: 0, wit: 0, presence: 0 },
    hp: 0,
    hp_max: 20,
    evasion: 10,
    mana: null,
    mana_max: null,
    conditions: [],
    class_abilities: [],
    spells_known: [],
    gold: 0,
    inventory: [],
    equipped_weapon: null,
    equipped_armor: null,
  },
  enemies: {},
  countdowns: {},
  in_combat: true,
};

describe('isBossZeroState (WS-7.2)', () => {
  it('is true when HP 0 in boss combat', () => {
    expect(
      isBossZeroState({ ...base, boss_encounter: true }),
    ).toBe(true);
  });

  it('is false without boss flag', () => {
    expect(isBossZeroState(base)).toBe(false);
  });
});

describe('shouldNonBossAutoRecover', () => {
  it('is true for non-boss HP 0', () => {
    expect(shouldNonBossAutoRecover(base)).toBe(true);
  });

  it('is false when boss encounter', () => {
    expect(
      shouldNonBossAutoRecover({ ...base, boss_encounter: true }),
    ).toBe(false);
  });
});

describe('applyNonBossAutoRecover', () => {
  it('restores full HP and mana', () => {
    const c = {
      ...base.character!,
      hp: 0,
      mana: 2,
      mana_max: 9,
    };
    const next = applyNonBossAutoRecover(c);
    expect(next.hp).toBe(20);
    expect(next.mana).toBe(9);
  });
});

describe('rollRiskItAll', () => {
  it('survives on nat 20', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.95);
    expect(rollRiskItAll()).toEqual({ nat: 20, survived: true, hp: 5 });
    vi.restoreAllMocks();
  });

  it('dies on low roll', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0);
    expect(rollRiskItAll().survived).toBe(false);
    vi.restoreAllMocks();
  });
});
