import { describe, expect, it, vi } from 'vitest';
import { DEMO_CHARACTER } from '@/lib/play/characterView';
import {
  applyLevelUp,
  computeFixedHpGain,
  hitDieSides,
  levelUpSelectionToRequest,
  rollHpGain,
  shouldBlockForLevelUp,
} from '@/lib/play/levelUp';

describe('shouldBlockForLevelUp (WS-7.1)', () => {
  it('blocks when XP threshold met and not in combat', () => {
    expect(
      shouldBlockForLevelUp({ ...DEMO_CHARACTER, xp: 1_000 }, false),
    ).toBe(true);
  });

  it('does not block during combat', () => {
    expect(
      shouldBlockForLevelUp({ ...DEMO_CHARACTER, xp: 1_000 }, true),
    ).toBe(false);
  });
});

describe('applyLevelUp', () => {
  it('always applies HP plus evasion bonus', () => {
    const next = applyLevelUp(DEMO_CHARACTER, {
      hp: { mode: 'fixed', amount: 7 },
      bonus: { kind: 'evasion' },
    });
    expect(next.level).toBe(5);
    expect(next.hp_max).toBe(DEMO_CHARACTER.hp_max + 7);
    expect(next.evasion).toBe(DEMO_CHARACTER.evasion + 1);
  });

  it('always applies HP plus class ability', () => {
    const next = applyLevelUp(DEMO_CHARACTER, {
      hp: { mode: 'roll', amount: 5 },
      bonus: { kind: 'ability', abilityId: 'battle_cry' },
    });
    expect(next.hp_max).toBe(DEMO_CHARACTER.hp_max + 5);
    expect(next.class_abilities).toContain('battle_cry');
  });
});

describe('HP gain math', () => {
  it('computes fixed HP from hit die and might', () => {
    expect(computeFixedHpGain(hitDieSides('mage'), -1)).toBe(2);
  });

  it('rolls hit die + might', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0);
    expect(rollHpGain(10, 2)).toBe(3);
    vi.restoreAllMocks();
  });
});

describe('levelUpSelectionToRequest', () => {
  it('maps HP + evasion to API body', () => {
    expect(
      levelUpSelectionToRequest({
        hp: { mode: 'fixed', amount: 7 },
        bonus: { kind: 'evasion' },
      }),
    ).toEqual({ kind: 'evasion', hp_mode: 'fixed', hp_amount: 7 });
  });

  it('maps HP + ability to API body', () => {
    expect(
      levelUpSelectionToRequest({
        hp: { mode: 'roll', amount: 9 },
        bonus: { kind: 'ability', abilityId: 'battle_cry' },
      }),
    ).toEqual({
      kind: 'ability',
      hp_mode: 'roll',
      hp_amount: 9,
      ability_id: 'battle_cry',
    });
  });
});
