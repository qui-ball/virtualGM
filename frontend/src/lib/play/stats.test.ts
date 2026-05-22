import { describe, expect, it } from 'vitest';
import {
  formatSignedModifier,
  isCaster,
  statAriaLabel,
  statToShort,
} from '@/lib/play/stats';

describe('statToShort', () => {
  it('maps API stat keys to UI short labels', () => {
    expect(statToShort('might')).toBe('Mig');
    expect(statToShort('finesse')).toBe('Fin');
    expect(statToShort('wit')).toBe('Wit');
    expect(statToShort('presence')).toBe('Pre');
  });
});

describe('statAriaLabel', () => {
  it('uses full words for screen readers', () => {
    expect(statAriaLabel('might', 2)).toBe('Might plus 2');
    expect(statAriaLabel('wit', -1)).toBe('Wit minus 1');
    expect(statAriaLabel('finesse', 0)).toBe('Finesse zero');
  });
});

describe('formatSignedModifier', () => {
  it('prefixes non-negative values with plus', () => {
    expect(formatSignedModifier(2)).toBe('+2');
    expect(formatSignedModifier(0)).toBe('+0');
    expect(formatSignedModifier(-1)).toBe('-1');
  });
});

describe('isCaster', () => {
  it('returns true for mage and bard only', () => {
    expect(isCaster('mage')).toBe(true);
    expect(isCaster('Mage')).toBe(true);
    expect(isCaster('bard')).toBe(true);
    expect(isCaster('warrior')).toBe(false);
    expect(isCaster('ranger')).toBe(false);
  });
});
