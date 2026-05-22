import { describe, expect, it } from 'vitest';
import { hpChipVariant } from '@/lib/play/vitalStrip';

describe('hpChipVariant', () => {
  it('returns default above 60% HP', () => {
    expect(hpChipVariant(7, 10)).toBe('default');
  });

  it('returns warn between 30% and 60%', () => {
    expect(hpChipVariant(5, 10)).toBe('warn');
    expect(hpChipVariant(4, 10)).toBe('warn');
  });

  it('returns bad at or below 30%', () => {
    expect(hpChipVariant(3, 10)).toBe('bad');
    expect(hpChipVariant(0, 10)).toBe('bad');
  });

  it('returns default when hpMax is zero', () => {
    expect(hpChipVariant(0, 0)).toBe('default');
  });
});
