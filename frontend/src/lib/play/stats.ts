import type { Stats } from '@/types';

export const STAT_KEYS = ['might', 'finesse', 'wit', 'presence'] as const;

export type StatKey = (typeof STAT_KEYS)[number];

export type StatShort = 'Mig' | 'Fin' | 'Wit' | 'Pre';

const STAT_SHORT: Record<StatKey, StatShort> = {
  might: 'Mig',
  finesse: 'Fin',
  wit: 'Wit',
  presence: 'Pre',
};

const STAT_ARIA: Record<StatKey, string> = {
  might: 'Might',
  finesse: 'Finesse',
  wit: 'Wit',
  presence: 'Presence',
};

const CASTER_CLASSES = new Set(['mage', 'bard']);

export function statToShort(key: StatKey): StatShort {
  return STAT_SHORT[key];
}

export function statAriaLabel(key: StatKey, modifier: number): string {
  const word = STAT_ARIA[key];
  if (modifier === 0) {
    return `${word} zero`;
  }
  if (modifier > 0) {
    return `${word} plus ${modifier}`;
  }
  return `${word} minus ${Math.abs(modifier)}`;
}

export function formatSignedModifier(value: number): string {
  return value >= 0 ? `+${value}` : `${value}`;
}

export function isCaster(characterClass: string): boolean {
  return CASTER_CLASSES.has(characterClass.toLowerCase());
}

export function formatClassLabel(characterClass: string): string {
  const c = characterClass.toLowerCase();
  return c.charAt(0).toUpperCase() + c.slice(1);
}

export function statEntries(stats: Stats): {
  key: StatKey;
  short: StatShort;
  mod: number;
  ariaLabel: string;
}[] {
  return STAT_KEYS.map((key) => {
    const mod = stats[key];
    return {
      key,
      short: statToShort(key),
      mod,
      ariaLabel: statAriaLabel(key, mod),
    };
  });
}
