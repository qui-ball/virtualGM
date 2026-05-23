import { ABILITY_CATALOG } from '@/lib/play/sheetCatalog';
import { isPendingLevelUp } from '@/lib/play/xp';
import type { CharacterState, LevelUpRequest } from '@/types';
import type { DiceType } from '@/types';

export type LevelUpChoiceKind = 'hp' | 'evasion' | 'ability';
export type HpGainMode = 'fixed' | 'roll';

export type LevelUpSelection =
  | { kind: 'hp'; mode: HpGainMode; amount: number }
  | { kind: 'evasion' }
  | { kind: 'ability'; abilityId: string };

const CLASS_HIT_DICE: Record<string, DiceType> = {
  warrior: 'd10',
  mage: 'd6',
  ranger: 'd8',
  bard: 'd8',
};

const DICE_SIDES: Record<DiceType, number> = {
  d4: 4,
  d6: 6,
  d8: 8,
  d10: 10,
  d12: 12,
  d20: 20,
  d100: 100,
};

export function hitDieSides(characterClass: string): number {
  const die = CLASS_HIT_DICE[characterClass.toLowerCase()] ?? 'd8';
  return DICE_SIDES[die];
}

export function hitDieLabel(characterClass: string): string {
  return CLASS_HIT_DICE[characterClass.toLowerCase()] ?? 'd8';
}

/** Level-up only outside combat (wireframe gate). */
export function canLevelUpOutsideBattle(inCombat: boolean): boolean {
  return !inCombat;
}

export function shouldBlockForLevelUp(
  character: CharacterState,
  inCombat: boolean,
): boolean {
  return (
    isPendingLevelUp(character.xp, character.level) &&
    canLevelUpOutsideBattle(inCombat)
  );
}

export function computeFixedHpGain(hitSides: number, mightMod: number): number {
  return Math.max(1, Math.floor(hitSides / 2) + mightMod);
}

export function rollHpGain(
  hitSides: number,
  mightMod: number,
  random: () => number = Math.random,
): number {
  const die = 1 + Math.floor(random() * hitSides);
  return Math.max(1, die + mightMod);
}

export function abilitiesForLevelPick(character: CharacterState) {
  const nextLevel = character.level + 1;
  return Object.values(ABILITY_CATALOG).filter(
    (a) => a.requiredLevel === nextLevel,
  );
}

export function applyLevelUp(
  character: CharacterState,
  selection: LevelUpSelection,
): CharacterState {
  const nextLevel = character.level + 1;
  const base = { ...character, level: nextLevel };

  if (selection.kind === 'hp') {
    return {
      ...base,
      hp_max: base.hp_max + selection.amount,
      hp: base.hp + selection.amount,
    };
  }

  if (selection.kind === 'evasion') {
    return { ...base, evasion: base.evasion + 1 };
  }

  if (selection.kind === 'ability') {
    const ids = base.class_abilities.includes(selection.abilityId)
      ? base.class_abilities
      : [...base.class_abilities, selection.abilityId];
    return { ...base, class_abilities: ids };
  }

  return base;
}

/** Map UI selection → API level-up request (G7). */
export function levelUpSelectionToRequest(
  selection: LevelUpSelection,
): LevelUpRequest {
  if (selection.kind === 'hp') {
    return {
      kind: 'hp',
      hp_mode: selection.mode,
      hp_amount: selection.amount,
    };
  }
  if (selection.kind === 'ability') {
    return { kind: 'ability', ability_id: selection.abilityId };
  }
  return { kind: 'evasion' };
}
