import { describe, expect, it } from 'vitest';

import { THEME_IDS } from './theme-ids';
import { THEME_REGISTRY, getThemeRegistryEntry } from './registry';

describe('THEME_REGISTRY', () => {
  it('has exactly one row per ThemeId in spec order', () => {
    expect(THEME_REGISTRY.length).toBe(THEME_IDS.length);
    expect(THEME_REGISTRY.map((r) => r.id)).toEqual([...THEME_IDS]);
  });

  it('only dark-fantasy omits a remote stylesheet (system-first load)', () => {
    const withoutUrl = THEME_REGISTRY.filter((r) => !r.googleFontsStylesheetUrl);
    expect(withoutUrl.map((r) => r.id)).toEqual(['dark-fantasy']);
  });

  it('every remote stylesheet uses display=swap', () => {
    for (const row of THEME_REGISTRY) {
      if (row.googleFontsStylesheetUrl) {
        expect(row.googleFontsStylesheetUrl).toContain('display=swap');
      }
    }
  });

  it('getThemeRegistryEntry returns the row for each id', () => {
    for (const id of THEME_IDS) {
      expect(getThemeRegistryEntry(id).id).toBe(id);
      expect(getThemeRegistryEntry(id).label.length).toBeGreaterThan(0);
    }
  });
});
