import type { DiceType } from '@/types';

export const DICE_SIDES: Record<DiceType, number> = {
  d4: 4,
  d6: 6,
  d8: 8,
  d10: 10,
  d12: 12,
  d20: 20,
  d100: 100,
};

export function rollDie(sides: number): number {
  return 1 + Math.floor(Math.random() * sides);
}

export function formatDiceExpression(
  diceCount: number,
  diceType: DiceType,
): string {
  return diceCount === 1 ? diceType : `${diceCount}${diceType}`;
}

export function formatSignedModifier(modifier: number): string {
  if (modifier === 0) return '';
  return modifier > 0 ? ` +${modifier}` : ` ${modifier}`;
}
