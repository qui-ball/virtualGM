import {
  formatClassLabel,
  formatSignedModifier,
  isCaster,
  statEntries,
  type StatKey,
} from '@/lib/play/stats';
import { statDisplayLabel } from '@/lib/play/statLabels';
import { coinDisplayRows, resolveCoinPurse } from '@/lib/play/currency';
import type { CoinDisplay } from '@/lib/play/currency';
import { isPendingLevelUp, xpToReachLevel } from '@/lib/play/xp';
import type { CharacterState, ConditionName } from '@/types';

export type ConditionView = {
  id: ConditionName;
  label: string;
};

export type StatEntryView = {
  key: StatKey;
  short: string;
  label: string;
  mod: number;
  signed: string;
  ariaLabel: string;
};

export type CharacterView = {
  name: string;
  classLabel: string;
  level: number;
  xp: number;
  xpNext: number | null;
  pendingLevelUp: boolean;
  stats: StatEntryView[];
  hp: number;
  hpMax: number;
  mana: number | null;
  manaMax: number | null;
  evasion: number;
  initiativeMod: number;
  showMana: boolean;
  conditions: ConditionView[];
  /** @deprecated Use `coins` — kept for API gold field. */
  gold: number;
  coins: CoinDisplay[];
  inventory: string[];
  classAbilities: string[];
  spellsKnown: string[];
};

function formatCondition(id: ConditionName): string {
  return id.charAt(0).toUpperCase() + id.slice(1);
}

export function toCharacterView(character: CharacterState): CharacterView {
  const showMana = isCaster(character.character_class);
  const xpNext = xpToReachLevel(character.level + 1);

  return {
    name: character.name,
    classLabel: formatClassLabel(character.character_class),
    level: character.level,
    xp: character.xp,
    xpNext,
    pendingLevelUp: isPendingLevelUp(character.xp, character.level),
    stats: statEntries(character.stats).map((s) => ({
      key: s.key,
      short: s.short,
      label: statDisplayLabel(s.key),
      mod: s.mod,
      signed: formatSignedModifier(s.mod),
      ariaLabel: s.ariaLabel,
    })),
    hp: character.hp,
    hpMax: character.hp_max,
    mana: character.mana,
    manaMax: character.mana_max,
    evasion: character.evasion,
    initiativeMod: character.stats.finesse,
    showMana,
    conditions: character.conditions.map((id) => ({
      id,
      label: formatCondition(id),
    })),
    gold: character.gold,
    coins: coinDisplayRows(resolveCoinPurse(character)),
    inventory: character.inventory,
    classAbilities: character.class_abilities,
    spellsKnown: character.spells_known,
  };
}

/** Lobby / demo fixture when no live session character is loaded. */
export const DEMO_CHARACTER: CharacterState = {
  name: 'Zaelan',
  character_class: 'mage',
  level: 4,
  xp: 680,
  stats: { might: -1, finesse: 0, wit: 2, presence: 1 },
  hp: 18,
  hp_max: 22,
  evasion: 12,
  mana: 6,
  mana_max: 9,
  conditions: [],
  class_abilities: ['stormborn', 'arcane_reservoir', 'chain_reaction'],
  spells_known: [
    'voltaic_lance',
    'static_snare',
    'arc_surge',
    'call_the_storm',
  ],
  gold: 24,
  coin_purse: { copper: 12, silver: 8, gold: 24, platinum: 1 },
  inventory: ['Healing draught ×2', 'Spellbook', 'Dagger'],
  equipped_weapon: 'Storm Staff',
  equipped_armor: 'Robe of Currents',
};

export function demoCharacterView(): CharacterView {
  return toCharacterView(DEMO_CHARACTER);
}
