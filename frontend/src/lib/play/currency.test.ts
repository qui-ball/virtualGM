import { describe, expect, it } from 'vitest';
import { coinDisplayRows, resolveCoinPurse } from '@/lib/play/currency';
import type { CharacterState } from '@/types';

const base: CharacterState = {
  name: 'Test',
  character_class: 'warrior',
  level: 1,
  xp: 0,
  stats: { might: 0, finesse: 0, wit: 0, presence: 0 },
  hp: 10,
  hp_max: 10,
  evasion: 10,
  mana: null,
  mana_max: null,
  conditions: [],
  class_abilities: [],
  spells_known: [],
  gold: 10,
  inventory: [],
  equipped_weapon: null,
  equipped_armor: null,
};

describe('currency', () => {
  it('maps gold-only API to GP', () => {
    const purse = resolveCoinPurse(base);
    expect(purse.gold).toBe(10);
    expect(purse.copper).toBe(0);
  });

  it('uses coin_purse when provided', () => {
    const purse = resolveCoinPurse({
      ...base,
      coin_purse: { copper: 5, silver: 2, gold: 3, platinum: 1 },
    });
    expect(purse.platinum).toBe(1);
  });

  it('orders CP · SP · GP · PP', () => {
    const rows = coinDisplayRows({
      copper: 1,
      silver: 2,
      gold: 3,
      platinum: 4,
    });
    expect(rows.map((r) => r.abbr)).toEqual(['CP', 'SP', 'GP', 'PP']);
  });
});
