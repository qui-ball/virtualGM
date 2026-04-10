import type { ThemeId } from './theme-ids';
import { THEME_IDS } from './theme-ids';

/** One row per preset theme. Fonts: [Google Fonts — open license](https://fonts.google.com/about). */
export type ThemeRegistryEntry = {
  id: ThemeId;
  label: string;
  /**
   * Full `css2` Google Fonts stylesheet URL (`display=swap` required).
   * Omit for themes that use the system stack only (`dark-fantasy` at first paint).
   */
  googleFontsStylesheetUrl?: string;
};

/** Source of truth for labels + optional remote font CSS (not the id list — see theme-ids). */
const REGISTRY: Record<ThemeId, ThemeRegistryEntry> = {
  'dark-fantasy': {
    id: 'dark-fantasy',
    label: 'Obsidian Court',
  },
  'sylvan-elven': {
    id: 'sylvan-elven',
    label: 'Sylvan Covenant',
    googleFontsStylesheetUrl:
      'https://fonts.googleapis.com/css2?family=Cormorant+Garamond:wght@400;600&family=Source+Sans+3:wght@400;500;600&display=swap',
  },
  'bastion-city': {
    id: 'bastion-city',
    label: 'Bastion Command',
    googleFontsStylesheetUrl:
      'https://fonts.googleapis.com/css2?family=Staatliches&family=Roboto+Condensed:wght@400;500;700&display=swap',
  },
  'arcanum-spire': {
    id: 'arcanum-spire',
    label: 'Arcanum Spire',
    googleFontsStylesheetUrl:
      'https://fonts.googleapis.com/css2?family=Cinzel:wght@400;600&family=Source+Sans+3:wght@400;500;600&display=swap',
  },
  'grave-veil': {
    id: 'grave-veil',
    label: 'Grave Veil',
    googleFontsStylesheetUrl:
      'https://fonts.googleapis.com/css2?family=Spectral:wght@400;600&family=IBM+Plex+Sans:wght@400;500;600&display=swap',
  },
  'iron-horde': {
    id: 'iron-horde',
    label: 'Iron Horde',
    googleFontsStylesheetUrl:
      'https://fonts.googleapis.com/css2?family=Teko:wght@400;600&family=Barlow+Condensed:wght@400;500;600&display=swap',
  },
  clockwork: {
    id: 'clockwork',
    label: 'Aetherworks',
    googleFontsStylesheetUrl:
      'https://fonts.googleapis.com/css2?family=Share+Tech+Mono&family=Exo+2:wght@400;500;600&display=swap',
  },
  'neon-syndicate': {
    id: 'neon-syndicate',
    label: 'Neon Syndicate',
    googleFontsStylesheetUrl:
      'https://fonts.googleapis.com/css2?family=Orbitron:wght@400;600&family=Rajdhani:wght@400;500;600&display=swap',
  },
  'brass-steam': {
    id: 'brass-steam',
    label: 'Brass Eclipse',
    googleFontsStylesheetUrl:
      'https://fonts.googleapis.com/css2?family=IM+Fell+English:ital@0;1&family=Lora:wght@400;500;600&display=swap',
  },
  'ember-dragon': {
    id: 'ember-dragon',
    label: 'Ember Crown',
    googleFontsStylesheetUrl:
      'https://fonts.googleapis.com/css2?family=Cinzel:wght@600;700&family=DM+Sans:wght@400;500;600&display=swap',
  },
};

export const THEME_REGISTRY: ThemeRegistryEntry[] = THEME_IDS.map(
  (id) => REGISTRY[id]
);

export function getThemeRegistryEntry(id: ThemeId): ThemeRegistryEntry {
  return REGISTRY[id];
}
