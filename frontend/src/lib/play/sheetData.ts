import {
  ABILITY_CATALOG,
  defaultArmorForClass,
  defaultWeaponForClass,
  formatAbilityId,
  SPELL_CATALOG,
  STAT_KEY_TO_SHORT,
  type SpellTierName,
} from '@/lib/play/sheetCatalog';
import { statDisplayLabel } from '@/lib/play/statLabels';
import {
  formatSignedModifier,
  isCaster,
  statEntries,
  type StatKey,
} from '@/lib/play/stats';
import type { CharacterState } from '@/types';

export type SheetTabId =
  | 'combat'
  | 'abilities'
  | 'spells'
  | 'inventory'
  | 'notes';

export type WeaponRow = {
  name: string;
  stat: string;
  dice: string;
  note: string;
  equipped: boolean;
  attackLabel: string;
};

export type ArmorRow = {
  name: string;
  type: string;
  restriction: string;
  detail: string;
};

export type SaveRow = {
  label: string;
  short: string;
  value: number;
  modLabel: string;
};

export type AbilityRow = {
  id: string;
  name: string;
  requiredLevel: number;
  description: string;
  locked: boolean;
  lockReason?: string;
};

export type SpellRow = {
  id: string;
  name: string;
  tier: SpellTierName;
  cost: number;
  description: string;
  locked: boolean;
  lockReason?: string;
  known: boolean;
};

export type InventoryItemRow = {
  name: string;
  qty: number;
};

export type SheetView = {
  tabs: SheetTabId[];
  weapons: WeaponRow[];
  armor: ArmorRow;
  saves: SaveRow[];
  abilities: AbilityRow[];
  spells: SpellRow[];
  inventory: InventoryItemRow[];
  activeWeapon: string;
  manaCurrent: number;
  manaMax: number;
  manaFormula: string;
  spellTiers: SpellTierName[];
};

export function sheetTabsFor(characterClass: string): SheetTabId[] {
  const base: SheetTabId[] = [
    'combat',
    'inventory',
    'abilities',
    'notes',
  ];
  if (isCaster(characterClass)) {
    return ['combat', 'spells', 'inventory', 'abilities', 'notes'];
  }
  return base;
}

export function maxUnlockedSpellTier(
  characterClass: string,
  level: number,
): SpellTierName {
  const c = characterClass.toLowerCase();
  if (c === 'mage') {
    if (level >= 6) return 'Mythic';
    if (level >= 3) return 'Major';
    return 'Minor';
  }
  if (c === 'bard') {
    if (level >= 8) return 'Mythic';
    if (level >= 4) return 'Major';
    return 'Minor';
  }
  return 'Minor';
}

function tierRank(tier: SpellTierName): number {
  if (tier === 'Minor') return 1;
  if (tier === 'Major') return 2;
  return 3;
}

function tierLockReason(
  tier: SpellTierName,
  characterClass: string,
  level: number,
): string | undefined {
  const max = maxUnlockedSpellTier(characterClass, level);
  if (tierRank(tier) <= tierRank(max)) return undefined;
  const c = characterClass.toLowerCase();
  if (tier === 'Major') {
    return c === 'bard' ? 'Unlocks at Lv 4' : 'Unlocks at Lv 3';
  }
  return c === 'bard' ? 'Unlocks at Lv 8' : 'Unlocks at Lv 6';
}

function manaFormulaCopy(character: CharacterState): string {
  const c = character.character_class.toLowerCase();
  if (c === 'mage') {
    return `4 + lv + Wit = ${character.mana_max ?? '—'}`;
  }
  if (c === 'bard') {
    return `3 + lv + Pre = ${character.mana_max ?? '—'}`;
  }
  return '';
}

function buildWeapons(character: CharacterState): WeaponRow[] {
  const primaryName =
    character.equipped_weapon ?? defaultWeaponForClass(character.character_class).name;
  const fallback = defaultWeaponForClass(character.character_class);
  const rows: WeaponRow[] = [];

  const primaryStatKey = weaponStatForName(primaryName, character.character_class);
  const primaryMod = character.stats[primaryStatKey];
  rows.push({
    name: primaryName,
    stat: STAT_KEY_TO_SHORT[primaryStatKey],
    dice: weaponDiceForName(primaryName, fallback.dice),
    note: primaryName === fallback.name ? fallback.note : 'equipped',
    equipped: true,
    attackLabel: `d20 ${formatSignedModifier(primaryMod)}`,
  });

  const hasDagger = character.inventory.some((i) =>
    /dagger/i.test(i),
  );
  if (hasDagger && !/dagger/i.test(primaryName)) {
    const mod = character.stats.finesse;
    rows.push({
      name: 'Dagger',
      stat: 'Fin',
      dice: 'd4',
      note: 'off-hand',
      equipped: false,
      attackLabel: `d20 ${formatSignedModifier(mod)}`,
    });
  }

  return rows;
}

function weaponStatForName(name: string, characterClass: string): StatKey {
  if (/bow|dagger|rapier/i.test(name)) return 'finesse';
  if (/staff|wand|spell/i.test(name)) return 'wit';
  const c = characterClass.toLowerCase();
  if (c === 'mage') return 'wit';
  if (c === 'bard') return 'finesse';
  return 'might';
}

function weaponDiceForName(name: string, fallback: string): string {
  if (/longsword|rapier/i.test(name)) return 'd8';
  if (/dagger/i.test(name)) return 'd4';
  if (/bow/i.test(name)) return 'd6';
  if (/staff|wand/i.test(name)) return 'd6';
  return fallback;
}

function parseInventoryItem(raw: string): InventoryItemRow {
  const qtyMatch = /×\s*(\d+)/.exec(raw);
  const name = raw.replace(/\s*×\s*\d+\s*$/, '').trim();
  return {
    name: name || raw,
    qty: qtyMatch ? Number(qtyMatch[1]) : 1,
  };
}

function buildAbilities(character: CharacterState): AbilityRow[] {
  const catalogIds = Object.keys(ABILITY_CATALOG);
  const ids = [
    ...character.class_abilities,
    ...catalogIds.filter((id) => !character.class_abilities.includes(id)),
  ].slice(0, 6);

  return ids.map((id) => {
    const meta = ABILITY_CATALOG[id];
    const requiredLevel = meta?.requiredLevel ?? 1;
    const locked = character.level < requiredLevel;
    return {
      id,
      name: meta?.name ?? formatAbilityId(id),
      requiredLevel,
      description:
        meta?.description ??
        'Class ability — details from campaign sheet when API ships.',
      locked,
      lockReason: locked ? `Requires Lv ${requiredLevel}` : undefined,
    };
  });
}

function buildSpells(character: CharacterState): SpellRow[] {
  if (character.spells?.length) {
    return character.spells.map((spell) => ({
      id: spell.id,
      name: spell.name,
      tier: spell.tier,
      cost: spell.mp_cost,
      description: spell.locked_reason ?? 'Cast via session turn API.',
      locked: spell.locked,
      lockReason: spell.locked ? spell.locked_reason ?? 'Locked' : undefined,
      known: !spell.locked,
    }));
  }

  const known = new Set(character.spells_known);
  const extraIds = Object.keys(SPELL_CATALOG).filter((id) => !known.has(id));
  const ids = [...character.spells_known, ...extraIds].slice(0, 8);

  return ids.map((id) => {
    const meta = SPELL_CATALOG[id];
    const tier = meta?.tier ?? 'Minor';
    const tierLocked = tierLockReason(
      tier,
      character.character_class,
      character.level,
    );
    const isKnown = known.has(id);
    const locked = !isKnown || tierLocked != null;
    let lockReason: string | undefined;
    if (!isKnown) {
      lockReason = 'Not in spellbook';
    } else if (tierLocked) {
      lockReason = tierLocked;
    }

    return {
      id,
      name: meta?.name ?? formatAbilityId(id),
      tier,
      cost: meta?.cost ?? (tier === 'Minor' ? 1 : tier === 'Major' ? 2 : 3),
      description:
        meta?.description ??
        'Spell details from class list when API ships.',
      locked,
      lockReason,
      known: isKnown,
    };
  });
}

export function buildSheetView(character: CharacterState): SheetView {
  const armorDefaults = defaultArmorForClass(character.character_class);
  const armorName =
    character.equipped_armor ?? `Armor · ${armorDefaults.type}`;

  return {
    tabs: sheetTabsFor(character.character_class),
    weapons: buildWeapons(character),
    armor: {
      name: armorName,
      type: armorDefaults.type,
      restriction: armorDefaults.restriction,
      detail: `${armorDefaults.evaNote} · Evasion ${character.evasion}`,
    },
    saves: statEntries(character.stats).map((s) => ({
      label: statDisplayLabel(s.key),
      short: s.short,
      value: 10 + s.mod,
      modLabel: formatSignedModifier(s.mod),
    })),
    abilities: buildAbilities(character),
    spells: buildSpells(character),
    inventory: character.inventory.map(parseInventoryItem),
    activeWeapon:
      character.equipped_weapon ??
      defaultWeaponForClass(character.character_class).name,
    manaCurrent: character.mana ?? 0,
    manaMax: character.mana_max ?? 0,
    manaFormula: manaFormulaCopy(character),
    spellTiers: ['Minor', 'Major', 'Mythic'],
  };
}

export function spellsForTier(spells: SpellRow[], tier: SpellTierName): SpellRow[] {
  return spells.filter((s) => s.tier === tier);
}
