import { describe, expect, it } from 'vitest';
import { readStoredTheme } from '@/theme/storage';
import { THEME_STORAGE_KEY } from '@/theme/registry';

describe('readStoredTheme', () => {
  it('returns default when storage is empty', () => {
    const storage = { getItem: () => null };
    expect(readStoredTheme(storage)).toBe('storm');
  });

  it('returns stored valid theme id', () => {
    const storage = {
      getItem: (key: string) =>
        key === THEME_STORAGE_KEY ? 'mithril' : null,
    };
    expect(readStoredTheme(storage)).toBe('mithril');
  });

  it('ignores invalid stored values', () => {
    const storage = {
      getItem: (key: string) =>
        key === THEME_STORAGE_KEY ? 'dragonfire' : null,
    };
    expect(readStoredTheme(storage)).toBe('storm');
  });
});
