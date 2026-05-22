import type { CharacterState } from '@/types';

export type CoinDenomination = 'copper' | 'silver' | 'gold' | 'platinum';

export type CoinPurse = Record<CoinDenomination, number>;

export type CoinDisplay = {
  key: CoinDenomination;
  label: string;
  abbr: string;
  amount: number;
};

const COIN_ORDER: CoinDenomination[] = [
  'copper',
  'silver',
  'gold',
  'platinum',
];

const COIN_META: Record<
  CoinDenomination,
  { label: string; abbr: string }
> = {
  copper: { label: 'Copper', abbr: 'CP' },
  silver: { label: 'Silver', abbr: 'SP' },
  gold: { label: 'Gold', abbr: 'GP' },
  platinum: { label: 'Platinum', abbr: 'PP' },
};

/** Resolve purse from API fields (`coin_purse` preferred; else `gold` → GP only). */
export function resolveCoinPurse(character: CharacterState): CoinPurse {
  if (character.coin_purse) {
    return { ...character.coin_purse };
  }
  return {
    copper: 0,
    silver: 0,
    gold: character.gold,
    platinum: 0,
  };
}

export function coinDisplayRows(purse: CoinPurse): CoinDisplay[] {
  return COIN_ORDER.map((key) => ({
    key,
    label: COIN_META[key].label,
    abbr: COIN_META[key].abbr,
    amount: purse[key],
  }));
}
