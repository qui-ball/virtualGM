import {
  maxUnlockedSpellTier,
  spellsForTier,
  type SheetView,
  type SpellRow,
} from '@/lib/play/sheetData';
import type { SpellTierName } from '@/lib/play/sheetCatalog';
import type { CharacterState } from '@/types';

export type CastTierOption = {
  id: SpellTierName;
  label: string;
  cost: number;
  locked: boolean;
  lockReason?: string;
};

const TIER_COST: Record<SpellTierName, number> = {
  Minor: 1,
  Major: 2,
  Mythic: 3,
};

const TIER_LABEL: Record<SpellTierName, string> = {
  Minor: 'Minor',
  Major: 'Major',
  Mythic: 'Mythic',
};

function tierRank(tier: SpellTierName): number {
  if (tier === 'Minor') return 1;
  if (tier === 'Major') return 2;
  return 3;
}

export function castTierOptions(
  character: CharacterState,
): CastTierOption[] {
  const max = maxUnlockedSpellTier(
    character.character_class,
    character.level,
  );
  const maxRank = tierRank(max);
  const tiers: SpellTierName[] = ['Minor', 'Major', 'Mythic'];

  return tiers.map((tier) => {
    const locked = tierRank(tier) > maxRank;
    let lockReason: string | undefined;
    if (locked) {
      const c = character.character_class.toLowerCase();
      if (tier === 'Major') {
        lockReason =
          c === 'bard' ? 'Unlocks at Lv 4' : 'Unlocks at Lv 3';
      } else {
        lockReason =
          c === 'bard' ? 'Unlocks at Lv 8' : 'Unlocks at Lv 6';
      }
    }
    return {
      id: tier,
      label: `${TIER_LABEL[tier]} ${TIER_COST[tier]}MP`,
      cost: TIER_COST[tier],
      locked,
      lockReason,
    };
  });
}

export function castableSpellsForTier(
  sheet: SheetView,
  tier: SpellTierName,
): SpellRow[] {
  return spellsForTier(sheet.spells, tier).filter((s) => !s.locked && s.known);
}

export function defaultCastTier(
  character: CharacterState,
): SpellTierName {
  return maxUnlockedSpellTier(character.character_class, character.level);
}

export function canAffordCast(
  manaCurrent: number,
  cost: number,
): boolean {
  return manaCurrent >= cost;
}

export type CastTrayResult = {
  spellId: string;
  spellName: string;
  tier: SpellTierName;
  cost: number;
  modifier: number;
};
