import type { ConditionName } from '@/types';
import type { PlayIconName } from '@/components/play/PlayIcon';
import {
  DEFAULT_RPG_THEME_ID,
  RPG_THEMES,
  type RpgThemeId,
  type RpgThemeMeta,
} from '@/theme/registry';

export type PlayGlyphName =
  | 'freeroll'
  | 'cast'
  | 'shortrest'
  | 'longrest'
  | 'item'
  | 'note'
  | 'signout'
  | 'debug';

export type AdvGlyphSet = {
  normal: string;
  advantage: string;
  disadvantage: string;
};

export type RpgThemeProfile = RpgThemeMeta & {
  /** Short picker blurb (Roll20 / D&D Beyond–style sheet identity). */
  blurb: string;
  fonts: {
    display: string;
    body: string;
    mono: string;
  };
  fontLabels: {
    display: string;
    body: string;
  };
  diceFace: string;
  iconStroke: number;
  glyphs: Record<PlayGlyphName, string>;
  conditionIcons: Record<ConditionName, string>;
  advGlyphs: AdvGlyphSet;
  /** Icons that differ most per theme (picker + docs). */
  signatureIcons: PlayIconName[];
};

const STORM_PROFILE: RpgThemeProfile = {
  id: 'storm',
  label: 'Storm',
  tag: 'Lightning Mage',
  blurb: 'Electric arcane — sharp type and bolt motifs like a Tempest cleric sheet.',
  fonts: {
    display: "'Orbitron', sans-serif",
    body: "'Exo 2', system-ui, sans-serif",
    mono: "'JetBrains Mono', ui-monospace, monospace",
  },
  fontLabels: { display: 'Orbitron', body: 'Exo 2' },
  diceFace: 'd20',
  iconStroke: 1.4,
  glyphs: {
    freeroll: '◈',
    cast: '⚡',
    shortrest: '☀',
    longrest: '☁',
    item: '⌁',
    note: '✎',
    signout: '↩',
    debug: '◈',
  },
  conditionIcons: {
    poisoned: '☠',
    stunned: '⚡',
    frightened: '◎',
    restrained: '⛓',
    prone: '▽',
  },
  advGlyphs: { normal: '•', advantage: '↟', disadvantage: '↡' },
  signatureIcons: ['bolt', 'scroll', 'shield'],
};

const NECROPOLIS_PROFILE: RpgThemeProfile = {
  id: 'necropolis',
  label: 'Undead',
  tag: 'Lich-touched',
  blurb: 'Gothic necromancy — decorative serifs and bone sigils like an evil cult sheet.',
  fonts: {
    display: "'Cinzel Decorative', 'Cinzel', serif",
    body: "'Crimson Pro', Georgia, serif",
    mono: "'IBM Plex Mono', ui-monospace, monospace",
  },
  fontLabels: { display: 'Cinzel Decorative', body: 'Crimson Pro' },
  diceFace: 'XX',
  iconStroke: 1.5,
  glyphs: {
    freeroll: '☠',
    cast: '☽',
    shortrest: '☽',
    longrest: '⛧',
    item: '⚰',
    note: '✎',
    signout: '↩',
    debug: '☠',
  },
  conditionIcons: {
    poisoned: '☠',
    stunned: '☠',
    frightened: '◉',
    restrained: '⛓',
    prone: '▽',
  },
  advGlyphs: { normal: '•', advantage: '☊', disadvantage: '☋' },
  signatureIcons: ['scroll', 'shield', 'swords'],
};

const OBSIDIAN_PROFILE: RpgThemeProfile = {
  id: 'obsidian',
  label: 'Obsidian',
  tag: 'Forge Warrior',
  blurb: 'Molten forge — bold condensed headers and heavy arms like a fighter action bar.',
  fonts: {
    display: "'Teko', sans-serif",
    body: "'Source Sans 3', system-ui, sans-serif",
    mono: "'JetBrains Mono', ui-monospace, monospace",
  },
  fontLabels: { display: 'Teko', body: 'Source Sans 3' },
  diceFace: '20',
  iconStroke: 2,
  glyphs: {
    freeroll: '⬡',
    cast: '⚒',
    shortrest: '☀',
    longrest: '♨',
    item: '⚔',
    note: '✎',
    signout: '↩',
    debug: '⬡',
  },
  conditionIcons: {
    poisoned: '☠',
    stunned: '⚒',
    frightened: '⚠',
    restrained: '⛓',
    prone: '▽',
  },
  advGlyphs: { normal: '•', advantage: '▲', disadvantage: '▼' },
  signatureIcons: ['swords', 'shield', 'bolt'],
};

const MITHRIL_PROFILE: RpgThemeProfile = {
  id: 'mithril',
  label: 'Mithril',
  tag: 'Argent Cleric',
  blurb: 'Sacred silver — refined Garamond titles and holy crests like a cleric spell list.',
  fonts: {
    display: "'Cormorant Garamond', serif",
    body: "'Nunito Sans', system-ui, sans-serif",
    mono: "'IBM Plex Mono', ui-monospace, monospace",
  },
  fontLabels: { display: 'Cormorant Garamond', body: 'Nunito Sans' },
  diceFace: '20',
  iconStroke: 1.2,
  glyphs: {
    freeroll: '✧',
    cast: '✠',
    shortrest: '☀',
    longrest: '☽',
    item: '✠',
    note: '✎',
    signout: '↩',
    debug: '✧',
  },
  conditionIcons: {
    poisoned: '☠',
    stunned: '✠',
    frightened: '◎',
    restrained: '⛓',
    prone: '▽',
  },
  advGlyphs: { normal: '•', advantage: '✦', disadvantage: '✧' },
  signatureIcons: ['shield', 'scroll', 'home'],
};

const GRIMOIRE_PROFILE: RpgThemeProfile = {
  id: 'grimoire',
  label: 'Grimoire',
  tag: 'Spellbook Scholar',
  blurb: 'Parchment scholar — bookish Garamond and quill marks like a D&D Beyond character sheet.',
  fonts: {
    display: "'EB Garamond', serif",
    body: "'Lora', Georgia, serif",
    mono: "'Courier Prime', ui-monospace, monospace",
  },
  fontLabels: { display: 'EB Garamond', body: 'Lora' },
  diceFace: '20',
  iconStroke: 1.5,
  glyphs: {
    freeroll: '⚄',
    cast: '✶',
    shortrest: '☼',
    longrest: '☾',
    item: '⚗',
    note: '✎',
    signout: '↩',
    debug: '⚄',
  },
  conditionIcons: {
    poisoned: '☠',
    stunned: '✶',
    frightened: '◎',
    restrained: '⛓',
    prone: '▽',
  },
  advGlyphs: { normal: '•', advantage: '↑', disadvantage: '↓' },
  signatureIcons: ['scroll', 'swords', 'home'],
};

export const RPG_THEME_PROFILES: Record<RpgThemeId, RpgThemeProfile> = {
  storm: STORM_PROFILE,
  necropolis: NECROPOLIS_PROFILE,
  obsidian: OBSIDIAN_PROFILE,
  mithril: MITHRIL_PROFILE,
  grimoire: GRIMOIRE_PROFILE,
};

export function getRpgThemeProfile(id: RpgThemeId): RpgThemeProfile {
  return RPG_THEME_PROFILES[id] ?? RPG_THEME_PROFILES[DEFAULT_RPG_THEME_ID];
}

/** All webfont families used across RPG themes (loaded once on boot). */
export const RPG_THEME_FONT_FAMILIES = [
  'Orbitron',
  'Exo+2',
  'Cinzel',
  'Cinzel+Decorative',
  'Crimson+Pro',
  'IBM+Plex+Mono',
  'Teko',
  'Source+Sans+3',
  'Cormorant+Garamond',
  'Nunito+Sans',
  'EB+Garamond',
  'Lora',
  'Courier+Prime',
  'JetBrains+Mono',
  'Inter',
] as const;

export function listRpgThemeProfiles(): readonly RpgThemeProfile[] {
  return RPG_THEMES.map((meta) => RPG_THEME_PROFILES[meta.id]);
}
