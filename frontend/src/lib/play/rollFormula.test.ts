import { describe, expect, it } from 'vitest';
import {
  isSkillCheckResult,
  rollBreakdownForResult,
  rollVerdictForResult,
} from '@/lib/play/rollFormula';
import type { RollResultFields } from '@/lib/play/transcript';

const skillCheck: RollResultFields = {
  id: '1',
  promptId: 'p1',
  label: 'Wit check',
  diceType: 'd20',
  diceCount: 1,
  nat: 20,
  dieA: 20,
  total: 20,
  modifier: 0,
  advUsed: 'norm',
  crit: true,
  fumble: false,
  pass: true,
  dc: 8,
  vs: 8,
  vsLabel: 'DC 8',
  stat: 'Wit',
};

describe('rollVerdictForResult', () => {
  it('treats nat 20 skill checks as success, not critical hit', () => {
    expect(isSkillCheckResult(skillCheck)).toBe(true);
    expect(rollVerdictForResult(skillCheck)).toBe('Success vs DC 8');
  });

  it('includes target in failure verdict for skill checks', () => {
    expect(
      rollVerdictForResult({ ...skillCheck, pass: false, nat: 5, total: 5 }),
    ).toBe('Failure vs DC 8');
  });

  it('still reports critical hit for attack rolls', () => {
    expect(
      rollVerdictForResult({
        ...skillCheck,
        label: 'Longsword attack',
        dc: 14,
        vs: 14,
        vsLabel: 'vs Eva 14',
        crit: true,
      }),
    ).toBe('Critical hit vs Eva 14');
  });
});

describe('rollBreakdownForResult', () => {
  it('always appends vs target for d20 checks', () => {
    const text = rollBreakdownForResult(skillCheck);
    expect(text).toContain('vs DC 8');
    expect(text).toContain('= 20');
  });
});
