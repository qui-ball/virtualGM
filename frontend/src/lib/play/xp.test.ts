import { describe, expect, it } from 'vitest';
import { isPendingLevelUp, xpToReachLevel } from '@/lib/play/xp';

describe('xpToReachLevel', () => {
  it('returns thresholds for levels 2–10', () => {
    expect(xpToReachLevel(2)).toBe(100);
    expect(xpToReachLevel(5)).toBe(1_000);
    expect(xpToReachLevel(10)).toBe(16_000);
  });

  it('returns null beyond max defined level', () => {
    expect(xpToReachLevel(11)).toBeNull();
  });
});

describe('isPendingLevelUp', () => {
  it('is false when below next threshold', () => {
    expect(isPendingLevelUp(0, 1)).toBe(false);
    expect(isPendingLevelUp(99, 1)).toBe(false);
  });

  it('is true at or above next threshold', () => {
    expect(isPendingLevelUp(100, 1)).toBe(true);
    expect(isPendingLevelUp(1_000, 4)).toBe(true);
  });

  it('flags Wren fixture (Lv 6, high XP)', () => {
    expect(isPendingLevelUp(11_200, 6)).toBe(true);
  });

  it('is false at max level when no next threshold', () => {
    expect(isPendingLevelUp(99_999, 10)).toBe(false);
  });
});
