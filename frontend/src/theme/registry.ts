export const RPG_THEME_IDS = [
  'storm',
  'necropolis',
  'obsidian',
  'mithril',
  'grimoire',
] as const;

export type RpgThemeId = (typeof RPG_THEME_IDS)[number];

export type RpgThemeMeta = {
  id: RpgThemeId;
  label: string;
  tag: string;
};

export const RPG_THEMES: readonly RpgThemeMeta[] = [
  { id: 'storm', label: 'Storm', tag: 'Lightning Mage' },
  { id: 'necropolis', label: 'Undead', tag: 'Lich-touched' },
  { id: 'obsidian', label: 'Obsidian', tag: 'Forge Warrior' },
  { id: 'mithril', label: 'Mithril', tag: 'Argent Cleric' },
  { id: 'grimoire', label: 'Grimoire', tag: 'Spellbook Scholar' },
] as const;

export const DEFAULT_RPG_THEME_ID: RpgThemeId = 'storm';

export const THEME_STORAGE_KEY = 'vgm-rpg-theme';

export function isRpgThemeId(value: string): value is RpgThemeId {
  return (RPG_THEME_IDS as readonly string[]).includes(value);
}

export function getRpgThemeMeta(id: RpgThemeId): RpgThemeMeta {
  return RPG_THEMES.find((t) => t.id === id) ?? RPG_THEMES[0];
}
