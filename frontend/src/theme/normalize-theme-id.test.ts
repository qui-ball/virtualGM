import { describe, expect, it } from 'vitest';

import { DEFAULT_THEME_ID, THEME_IDS } from './theme-ids';
import { normalizeThemeId } from './normalize-theme-id';

describe('normalizeThemeId', () => {
  it('maps legacy dark to dark-fantasy', () => {
    expect(normalizeThemeId('dark')).toBe('dark-fantasy');
    expect(normalizeThemeId('  dark  ')).toBe('dark-fantasy');
  });

  it('returns known ids unchanged', () => {
    for (const id of THEME_IDS) {
      expect(normalizeThemeId(id)).toBe(id);
      expect(normalizeThemeId(`  ${id}  `)).toBe(id);
    }
  });

  it('falls back for empty, unknown, or nullish input', () => {
    expect(normalizeThemeId('')).toBe(DEFAULT_THEME_ID);
    expect(normalizeThemeId('   ')).toBe(DEFAULT_THEME_ID);
    expect(normalizeThemeId('not-a-theme')).toBe(DEFAULT_THEME_ID);
    expect(normalizeThemeId(undefined)).toBe(DEFAULT_THEME_ID);
    expect(normalizeThemeId(null)).toBe(DEFAULT_THEME_ID);
  });
});
