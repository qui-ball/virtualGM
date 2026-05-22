import type { StatKey, StatShort } from '@/lib/play/stats';

export type SpellTierName = 'Minor' | 'Major' | 'Mythic';

export type SpellCatalogEntry = {
  id: string;
  name: string;
  tier: SpellTierName;
  cost: number;
  description: string;
};

export type AbilityCatalogEntry = {
  id: string;
  name: string;
  requiredLevel: number;
  description: string;
};

export const SPELL_CATALOG: Record<string, SpellCatalogEntry> = {
  magic_missile: {
    id: 'magic_missile',
    name: 'Magic Missile',
    tier: 'Minor',
    cost: 1,
    description:
      'Spell attack vs Evasion. On hit: 1d4 + Wit magic damage.',
  },
  fire_bolt: {
    id: 'fire_bolt',
    name: 'Fire Bolt',
    tier: 'Minor',
    cost: 1,
    description: 'Spell attack vs Evasion. On hit: 1d6 + Wit fire damage.',
  },
  voltaic_lance: {
    id: 'voltaic_lance',
    name: 'Voltaic Lance',
    tier: 'Minor',
    cost: 1,
    description:
      'd20 + Wit vs target Eva. On hit: d6 + Wit lightning damage.',
  },
  static_snare: {
    id: 'static_snare',
    name: 'Static Snare',
    tier: 'Minor',
    cost: 1,
    description:
      'Target Fin save (10 + Wit). On fail: Restrained until end of next turn.',
  },
  arc_surge: {
    id: 'arc_surge',
    name: 'Arc Surge',
    tier: 'Major',
    cost: 2,
    description:
      'd20 + Wit vs Eva. Hit: 2d6 + Wit lightning, chains at half damage.',
  },
  call_the_storm: {
    id: 'call_the_storm',
    name: 'Call the Storm',
    tier: 'Mythic',
    cost: 3,
    description:
      'Tempest 3 turns; each turn enemies in zone Fin save or take d8 lightning.',
  },
  healing_word: {
    id: 'healing_word',
    name: 'Healing Word',
    tier: 'Minor',
    cost: 1,
    description: 'Restore 1d6 + Presence HP to one ally within close range.',
  },
  vicious_mockery: {
    id: 'vicious_mockery',
    name: 'Vicious Mockery',
    tier: 'Minor',
    cost: 1,
    description:
      'Wit vs target Wit. On fail: 1d4 psychic and disadvantage on next attack.',
  },
};

export const ABILITY_CATALOG: Record<string, AbilityCatalogEntry> = {
  stormborn: {
    id: 'stormborn',
    name: 'Stormborn',
    requiredLevel: 1,
    description:
      'Immune to lightning damage; ignore water-caused difficult terrain.',
  },
  arcane_reservoir: {
    id: 'arcane_reservoir',
    name: 'Arcane Reservoir',
    requiredLevel: 3,
    description: 'Once per long rest: regain 1d4 + 1 MP as a free action.',
  },
  chain_reaction: {
    id: 'chain_reaction',
    name: 'Chain Reaction',
    requiredLevel: 5,
    description:
      'On a crit with a lightning spell, arc to a second target for half damage.',
  },
  battle_cry: {
    id: 'battle_cry',
    name: 'Battle Cry',
    requiredLevel: 5,
    description:
      'Once per short rest: allies in close range gain advantage on next attack.',
  },
  inspiring_presence: {
    id: 'inspiring_presence',
    name: 'Inspiring Presence',
    requiredLevel: 1,
    description: '+2 to persuasion rolls.',
  },
  skirmisher: {
    id: 'skirmisher',
    name: 'Skirmisher',
    requiredLevel: 1,
    description: '+1 Evasion while wearing light or medium armor.',
  },
};

const DEFAULT_WEAPON_BY_CLASS: Record<
  string,
  { name: string; stat: StatShort; dice: string; note: string }
> = {
  warrior: {
    name: 'Longsword',
    stat: 'Mig',
    dice: 'd8',
    note: 'martial',
  },
  mage: {
    name: 'Storm Staff',
    stat: 'Wit',
    dice: 'd6',
    note: 'arcane focus',
  },
  bard: {
    name: 'Rapier',
    stat: 'Fin',
    dice: 'd8',
    note: 'finesse',
  },
  ranger: {
    name: 'Shortbow',
    stat: 'Fin',
    dice: 'd6',
    note: 'ranged',
  },
};

const ARMOR_BY_CLASS: Record<
  string,
  { type: string; restriction: string; evaNote: string }
> = {
  warrior: {
    type: 'Heavy',
    restriction: 'Warrior only',
    evaNote: '+2 Eva from armor',
  },
  mage: {
    type: 'Light',
    restriction: 'Mage allowed',
    evaNote: 'No Eva bonus',
  },
  bard: {
    type: 'Medium',
    restriction: 'Bard allowed',
    evaNote: '+1 Eva from armor',
  },
  ranger: {
    type: 'Medium',
    restriction: 'Ranger allowed',
    evaNote: '+1 Eva from armor',
  },
};

export function defaultWeaponForClass(characterClass: string) {
  return (
    DEFAULT_WEAPON_BY_CLASS[characterClass.toLowerCase()] ??
    DEFAULT_WEAPON_BY_CLASS.warrior
  );
}

export function defaultArmorForClass(characterClass: string) {
  return (
    ARMOR_BY_CLASS[characterClass.toLowerCase()] ?? ARMOR_BY_CLASS.warrior
  );
}

export function formatAbilityId(id: string): string {
  return id
    .split('_')
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ');
}

export function formatSpellId(id: string): string {
  return SPELL_CATALOG[id]?.name ?? formatAbilityId(id);
}

export const STAT_KEY_TO_SHORT: Record<StatKey, StatShort> = {
  might: 'Mig',
  finesse: 'Fin',
  wit: 'Wit',
  presence: 'Pre',
};
