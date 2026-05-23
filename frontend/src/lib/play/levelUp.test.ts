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
  it('applies HP gain', () => {
    const next = applyLevelUp(DEMO_CHARACTER, {
      kind: 'hp',
      mode: 'fixed',
      amount: 7,
    });
    expect(next.level).toBe(5);
    expect(next.hp_max).toBe(DEMO_CHARACTER.hp_max + 7);
  });

  it('applies evasion +1', () => {
    const next = applyLevelUp(DEMO_CHARACTER, { kind: 'evasion' });
    expect(next.evasion).toBe(DEMO_CHARACTER.evasion + 1);
  });

  it('adds class ability', () => {
    const next = applyLevelUp(DEMO_CHARACTER, {
      kind: 'ability',
      abilityId: 'battle_cry',
    });
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
  it('maps HP selection to API body', () => {
    expect(
      levelUpSelectionToRequest({ kind: 'hp', mode: 'fixed', amount: 7 }),
    ).toEqual({ kind: 'hp', hp_mode: 'fixed', hp_amount: 7 });
  });
});
