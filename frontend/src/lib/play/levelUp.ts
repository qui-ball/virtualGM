import { ABILITY_CATALOG } from '@/lib/play/sheetCatalog';
import { isPendingLevelUp } from '@/lib/play/xp';
import type { CharacterState, LevelUpRequest } from '@/types';
import type { DiceType } from '@/types';

export type HpGainMode = 'fixed' | 'roll';
export type LevelUpBonusKind = 'evasion' | 'ability';

/** Two-step level-up: HP is always granted, then evasion or ability. */
export type LevelUpSelection = {
  hp: { mode: HpGainMode; amount: number };
  bonus:
    | { kind: 'evasion' }
    | { kind: 'ability'; abilityId: string };
};

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
  let next: CharacterState = {
    ...character,
    level: nextLevel,
    hp_max: character.hp_max + selection.hp.amount,
    hp: character.hp + selection.hp.amount,
  };

  if (selection.bonus.kind === 'evasion') {
    next = { ...next, evasion: next.evasion + 1 };
  } else {
    const ids = next.class_abilities.includes(selection.bonus.abilityId)
      ? next.class_abilities
      : [...next.class_abilities, selection.bonus.abilityId];
    next = { ...next, class_abilities: ids };
  }

  return next;
}

/** Map UI selection → API level-up request (HP always + bonus). */
export function levelUpSelectionToRequest(
  selection: LevelUpSelection,
): LevelUpRequest {
  if (selection.bonus.kind === 'ability') {
    return {
      kind: 'ability',
      hp_mode: selection.hp.mode,
      hp_amount: selection.hp.amount,
      ability_id: selection.bonus.abilityId,
    };
  }
  return {
    kind: 'evasion',
    hp_mode: selection.hp.mode,
    hp_amount: selection.hp.amount,
  };
}
