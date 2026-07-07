import { describe, expect, it, vi } from 'vitest';
import {
  rollBreakdownText,
  rollButtonLabel,
  rollD20,
  rollDice,
  rollVerdictText,
} from '@/lib/play/roll';

describe('rollD20', () => {
  it('uses higher die on advantage', () => {
    vi.spyOn(Math, 'random')
      .mockReturnValueOnce(0) // dieA = 1
      .mockReturnValueOnce(0.95); // dieB = 20
    const r = rollD20({ adv: 'adv', modifier: 2, vs: 10 });
    expect(r.nat).toBe(20);
    expect(r.total).toBe(22);
    expect(r.pass).toBe(true);
    vi.restoreAllMocks();
  });

  it('detects nat 20 crit', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.95);
    const r = rollD20({ adv: 'norm', modifier: 0 });
    expect(r.nat).toBe(20);
    expect(r.crit).toBe(true);
    vi.restoreAllMocks();
  });

  it('detects nat 1 fumble', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0);
    const r = rollD20({ adv: 'norm', modifier: 0 });
    expect(r.nat).toBe(1);
    expect(r.fumble).toBe(true);
    vi.restoreAllMocks();
  });
});

describe('rollDice', () => {
  it('rolls weapon damage dice instead of d20', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.5); // d8 → 5
    const r = rollDice({ diceCount: 1, diceType: 'd8', modifier: 2 });
    expect(r.diceType).toBe('d8');
    expect(r.rolls).toEqual([5]);
    expect(r.total).toBe(7);
    expect(r.crit).toBe(false);
    vi.restoreAllMocks();
  });

  it('sums multiple damage dice', () => {
    vi.spyOn(Math, 'random')
      .mockReturnValueOnce(0.2) // d6 → 2
      .mockReturnValueOnce(0.8); // d6 → 5
    const r = rollDice({ diceCount: 2, diceType: 'd6', modifier: 1 });
    expect(r.rolls).toEqual([2, 5]);
    expect(r.total).toBe(8);
    vi.restoreAllMocks();
  });
});

describe('rollBreakdownText', () => {
  it('formats normal roll', () => {
    const text = rollBreakdownText(
      {
        dieA: 15,
        nat: 15,
        total: 17,
        modifier: 2,
        advUsed: 'norm',
        crit: false,
        fumble: false,
        pass: true,
      },
      'Wit',
    );
    expect(text).toContain('d20 = 15');
    expect(text).toContain('+2 Wit');
  });
});

describe('rollButtonLabel', () => {
  it('shows advantage dice notation', () => {
    expect(rollButtonLabel('adv', 2, 'Wit')).toBe('Roll 2d20↑ +2 Wit');
  });

  it('shows normal d20 when no advantage', () => {
    expect(rollButtonLabel('norm', -1, 'Mig')).toBe('Roll d20 -1 Mig');
  });
});

describe('rollVerdictText', () => {
  it('returns Success when pass', () => {
    expect(
      rollVerdictText({
        dieA: 10,
        nat: 10,
        total: 15,
        modifier: 5,
        advUsed: 'norm',
        crit: false,
        fumble: false,
        pass: true,
      }),
    ).toBe('Success');
  });
});
