import { describe, expect, it } from 'vitest';
import {
  ALL_CONDITIONS,
  CONDITION_CATALOG,
  conditionLabel,
} from '@/lib/play/conditions';

describe('CONDITION_CATALOG (WS-7.3)', () => {
  it('lists all five ruleset conditions', () => {
    expect(ALL_CONDITIONS).toHaveLength(5);
    expect(ALL_CONDITIONS).toEqual([
      'poisoned',
      'stunned',
      'frightened',
      'restrained',
      'prone',
    ]);
  });

  it('includes effect and removal copy for each', () => {
    for (const id of ALL_CONDITIONS) {
      const row = CONDITION_CATALOG[id];
      expect(row.effect.length).toBeGreaterThan(10);
      expect(row.removal.length).toBeGreaterThan(10);
      expect(conditionLabel(id)).toBe(row.label);
    }
  });
});
