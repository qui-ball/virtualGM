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

export function rollBreakdownForResult(result: RollResultFields): string {
  const diceType = result.diceType ?? 'd20';
  const diceCount = result.diceCount ?? 1;
  const modStr =
    result.modifier >= 0 ? `+${result.modifier}` : `${result.modifier}`;
  const statLabel = result.stat ?? 'mod';

  if (isD20Roll(diceType) && diceCount === 1) {
    if (result.advUsed !== 'norm' && result.dieB != null) {
      const take = result.advUsed === 'adv' ? 'higher' : 'lower';
      return `2d20 (${result.advUsed === 'adv' ? 'Adv' : 'Dis'}) = ${result.dieA}, ${result.dieB} · take ${take} ${result.nat} · ${modStr} ${statLabel}`;
    }
    return `d20 = ${result.nat} · ${modStr} ${statLabel}`;
  }

  const rolls = result.rolls?.length
    ? result.rolls
    : result.dieB != null
      ? [result.dieA, result.dieB]
      : [result.dieA];
  const diceExpr = formatDiceExpression(diceCount, diceType);
  const rollSum = rolls.reduce((sum, value) => sum + value, 0);
  if (result.modifier === 0) {
    return `${diceExpr} → [${rolls.join(', ')}] = ${rollSum}`;
  }
  return `${diceExpr} → [${rolls.join(', ')}] = ${rollSum} · ${modStr} ${statLabel} = ${result.total}`;
}

export function rollVerdictForResult(result: RollResultFields): string | null {
  const diceType = result.diceType ?? 'd20';
  if (!isD20Roll(diceType)) return null;
  if (result.crit) return 'Critical hit';
  if (result.fumble) return 'Fumble';
  if (result.pass === true) return 'Success';
  if (result.pass === false) return 'Miss';
  return null;
}

export function promptShowsTarget(prompt: RollPromptFields): boolean {
  return isD20Roll(prompt.diceType) && (prompt.vsLabel != null || prompt.dc != null);
}
