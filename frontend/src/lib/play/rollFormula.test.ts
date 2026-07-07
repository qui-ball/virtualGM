import { describe, expect, it } from 'vitest';
import {
  formatRollFormula,
  rollBreakdownForResult,
  rollButtonLabelForDice,
} from '@/lib/play/rollFormula';

describe('rollFormula', () => {
  it('formats d20 attack formula', () => {
    expect(formatRollFormula(1, 'd20', 2, 'Mig')).toBe('d20 +2 Mig');
  });

  it('formats damage formula', () => {
    expect(formatRollFormula(1, 'd8', 2, 'Mig')).toBe('d8 +2 Mig');
    expect(formatRollFormula(2, 'd6', 0)).toBe('2d6');
  });

  it('labels damage roll button with correct dice', () => {
    expect(rollButtonLabelForDice(1, 'd6', 'norm', 2, 'Mig')).toBe(
      'Roll d6 +2 Mig',
    );
  });

  it('breaks down multi-die damage result', () => {
    const text = rollBreakdownForResult({
      id: '1',
      promptId: 'p1',
      label: 'Damage',
      diceCount: 2,
      diceType: 'd6',
      rolls: [3, 5],
      nat: 3,
      dieA: 3,
      dieB: 5,
      total: 10,
      modifier: 2,
      advUsed: 'norm',
      crit: false,
      fumble: false,
      pass: null,
      stat: 'Mig',
    });
    expect(text).toContain('2d6');
    expect(text).toContain('[3, 5]');
    expect(text).toContain('= 10');
  });
});
