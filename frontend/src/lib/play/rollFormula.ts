import {
  formatDiceExpression,
  formatSignedModifier,
} from '@/lib/play/dice';
import type { AdvType, RollPromptFields, RollResultFields } from '@/lib/play/transcript';
import type { DiceType } from '@/types';

export function isD20Roll(diceType: DiceType): boolean {
  return diceType === 'd20';
}

export function formatRollFormula(
  diceCount: number,
  diceType: DiceType,
  modifier: number,
  stat?: string,
): string {
  const dice = formatDiceExpression(diceCount, diceType);
  const mod = formatSignedModifier(modifier);
  const statLabel = stat ? ` ${stat}` : '';
  return `${dice}${mod}${statLabel}`.trim();
}

export function rollButtonLabelForDice(
  diceCount: number,
  diceType: DiceType,
  adv: AdvType,
  modifier: number,
  stat?: string,
): string {
  if (isD20Roll(diceType) && diceCount === 1) {
    const modStr = modifier >= 0 ? `+${modifier}` : `${modifier}`;
    const dice =
      adv === 'adv' ? '2d20↑' : adv === 'dis' ? '2d20↓' : 'd20';
    return `Roll ${dice} ${modStr}${stat ? ` ${stat}` : ''}`;
  }
  const expr = formatRollFormula(diceCount, diceType, modifier, stat);
  return `Roll ${expr}`;
}

export function isD20CheckRoll(result: RollResultFields): boolean {
  return isD20Roll(result.diceType ?? 'd20') && (result.diceCount ?? 1) === 1;
}

function isAttackRollResult(result: RollResultFields): boolean {
  if (result.vsLabel && /eva|evasion|\bac\b/i.test(result.vsLabel)) {
    return true;
  }
  return /attack|strike|weapon|longsword|bow|hit\b/i.test(result.label);
}

/** Skill check / save — has a DC target (not an attack vs evasion). */
export function isSkillCheckResult(result: RollResultFields): boolean {
  if (!isD20CheckRoll(result) || isAttackRollResult(result)) {
    return false;
  }
  return (
    result.dc != null ||
    (result.vsLabel != null && /dc/i.test(result.vsLabel))
  );
}

export function formatRollTarget(result: RollResultFields): string | null {
  if (result.vsLabel) return result.vsLabel;
  if (result.dc != null) return `DC ${result.dc}`;
  if (result.vs != null) return `vs ${result.vs}`;
  return null;
}

function rollTargetSuffix(result: RollResultFields): string {
  const target = formatRollTarget(result);
  if (!target) return '';
  if (/^vs\s/i.test(target)) return ` ${target}`;
  return ` vs ${target}`;
}

export function rollBreakdownForResult(result: RollResultFields): string {
  const diceType = result.diceType ?? 'd20';
  const diceCount = result.diceCount ?? 1;
  const modStr =
    result.modifier >= 0 ? `+${result.modifier}` : `${result.modifier}`;
  const statLabel = result.stat ?? 'mod';

  let line: string;

  if (isD20Roll(diceType) && diceCount === 1) {
    if (result.advUsed !== 'norm' && result.dieB != null) {
      const take = result.advUsed === 'adv' ? 'higher' : 'lower';
      line = `2d20 (${result.advUsed === 'adv' ? 'Adv' : 'Dis'}) = ${result.dieA}, ${result.dieB} · take ${take} ${result.nat} · ${modStr} ${statLabel} = ${result.total}`;
    } else {
      line = `d20 = ${result.nat} · ${modStr} ${statLabel} = ${result.total}`;
    }
  } else {
    const rolls = result.rolls?.length
      ? result.rolls
      : result.dieB != null
        ? [result.dieA, result.dieB]
        : [result.dieA];
    const diceExpr = formatDiceExpression(diceCount, diceType);
    const rollSum = rolls.reduce((sum, value) => sum + value, 0);
    if (result.modifier === 0) {
      line = `${diceExpr} → [${rolls.join(', ')}] = ${rollSum}`;
    } else {
      line = `${diceExpr} → [${rolls.join(', ')}] = ${rollSum} · ${modStr} ${statLabel} = ${result.total}`;
    }
  }

  if (isD20CheckRoll(result) && formatRollTarget(result)) {
    line += ` ·${rollTargetSuffix(result)}`;
  }
  return line;
}

export function rollVerdictForResult(result: RollResultFields): string | null {
  const diceType = result.diceType ?? 'd20';
  if (!isD20Roll(diceType) || (result.diceCount ?? 1) !== 1) return null;

  const vsSuffix = rollTargetSuffix(result);

  if (isSkillCheckResult(result)) {
    if (result.pass === true) return `Success${vsSuffix}`;
    if (result.pass === false) return `Failure${vsSuffix}`;
    return null;
  }

  if (result.crit) return `Critical hit${vsSuffix}`;
  if (result.fumble) return `Fumble${vsSuffix}`;
  if (result.pass === true) {
    return isAttackRollResult(result) ? `Hit${vsSuffix}` : `Success${vsSuffix}`;
  }
  if (result.pass === false) {
    return isAttackRollResult(result) ? `Miss${vsSuffix}` : `Failure${vsSuffix}`;
  }
  return null;
}

export function promptShowsTarget(prompt: RollPromptFields): boolean {
  return isD20Roll(prompt.diceType) && (prompt.vsLabel != null || prompt.dc != null);
}
