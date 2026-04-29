/** Canonical preset theme ids (persisted to DB / localStorage). Order matches product spec. */
export const THEME_IDS = [
  'dark-fantasy',
  'sylvan-elven',
  'bastion-city',
  'arcanum-spire',
  'grave-veil',
  'iron-horde',
  'clockwork',
  'neon-syndicate',
  'brass-steam',
  'ember-dragon',
] as const;

export type ThemeId = (typeof THEME_IDS)[number];

export const DEFAULT_THEME_ID: ThemeId = 'dark-fantasy';

const THEME_SET: ReadonlySet<string> = new Set(THEME_IDS);

export function isThemeId(value: string): value is ThemeId {
  return THEME_SET.has(value);
}
