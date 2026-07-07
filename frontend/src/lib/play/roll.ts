import { DICE_SIDES, rollDie } from '@/lib/play/dice';
import type { AdvType } from '@/lib/play/transcript';
import type { DiceType } from '@/types';
import {
  rollBreakdownForResult,
  rollButtonLabelForDice,
  rollVerdictForResult,
} from '@/lib/play/rollFormula';

export type RollD20Input = {
  adv?: AdvType;
  modifier?: number;
  vs?: number | null;
};

export type RollDiceInput = {
  diceCount?: number;
  diceType?: DiceType;
  adv?: AdvType;
  modifier?: number;
  vs?: number | null;
};

export type RollD20Result = {
  dieA: number;
  dieB?: number;
  nat: number;
  total: number;
  modifier: number;
  advUsed: AdvType;
  crit: boolean;
  fumble: boolean;
  pass: boolean | null;
};

export type RollDiceResult = RollD20Result & {
  diceCount: number;
  diceType: DiceType;
  rolls: number[];
};

/** d20 attack/check/save roll with optional advantage. */
export function rollD20(input: RollD20Input = {}): RollD20Result {
  const adv = input.adv ?? 'norm';
  const mod = input.modifier ?? 0;
  const vs = input.vs ?? null;

  const dieA = rollDie(20);
  const dieB = adv !== 'norm' ? rollDie(20) : undefined;
  const nat =
    adv === 'adv' && dieB != null
      ? Math.max(dieA, dieB)
      : adv === 'dis' && dieB != null
        ? Math.min(dieA, dieB)
        : dieA;
  const total = nat + mod;

  return {
    dieA,
    dieB,
    nat,
    total,
    modifier: mod,
    advUsed: adv,
    crit: nat === 20,
    fumble: nat === 1,
    pass: vs != null ? total >= vs : null,
  };
}

/** Roll any dice expression from a pending GM prompt. */
export function rollDice(input: RollDiceInput = {}): RollDiceResult {
  const diceType = input.diceType ?? 'd20';
  const diceCount = Math.max(1, input.diceCount ?? 1);
  const modifier = input.modifier ?? 0;
  const vs = input.vs ?? null;

  if (diceType === 'd20' && diceCount === 1) {
    const r = rollD20({ adv: input.adv, modifier, vs });
    const rolls =
      r.advUsed !== 'norm' && r.dieB != null ? [r.dieA, r.dieB] : [r.nat];
    return {
      diceCount: 1,
      diceType: 'd20',
      rolls,
      ...r,
    };
  }

  const sides = DICE_SIDES[diceType];
  const rolls = Array.from({ length: diceCount }, () => rollDie(sides));
  const rollSum = rolls.reduce((sum, value) => sum + value, 0);
  const total = rollSum + modifier;

  return {
    diceCount,
    diceType,
    rolls,
    dieA: rolls[0] ?? 1,
    dieB: rolls[1],
    nat: rolls[0] ?? 1,
    total,
    modifier,
    advUsed: 'norm',
    crit: false,
    fumble: false,
    pass: vs != null ? total >= vs : null,
  };
}

export function rollButtonLabel(
  adv: AdvType,
  modifier: number,
  stat?: string,
  diceCount = 1,
  diceType: DiceType = 'd20',
): string {
  return rollButtonLabelForDice(diceCount, diceType, adv, modifier, stat);
}

export function rollBreakdownText(
  result: RollD20Result,
  stat?: string,
): string {
  return rollBreakdownForResult({
    id: '',
    promptId: '',
    label: '',
    stat,
    nat: result.nat,
    dieA: result.dieA,
    dieB: result.dieB,
    total: result.total,
    modifier: result.modifier,
    advUsed: result.advUsed,
    crit: result.crit,
    fumble: result.fumble,
    pass: result.pass,
    diceCount: 1,
    diceType: 'd20',
    rolls: result.advUsed !== 'norm' && result.dieB != null
      ? [result.dieA, result.dieB]
      : [result.nat],
  });
}

export function rollVerdictText(result: RollD20Result): string | null {
  return rollVerdictForResult({
    id: '',
    promptId: '',
    label: '',
    nat: result.nat,
    dieA: result.dieA,
    dieB: result.dieB,
    total: result.total,
    modifier: result.modifier,
    advUsed: result.advUsed,
    crit: result.crit,
    fumble: result.fumble,
    pass: result.pass,
    diceCount: 1,
    diceType: 'd20',
    rolls: [result.nat],
  });
}
