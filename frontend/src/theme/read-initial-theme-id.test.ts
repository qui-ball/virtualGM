import { describe, expect, it } from 'vitest';

import { THEME_STORAGE_KEY } from './constants';
import { readInitialThemeId } from './read-initial-theme-id';

describe('readInitialThemeId', () => {
  it('prefers data-theme on documentElement over storage', () => {
    const doc = document.implementation.createHTMLDocument('');
    doc.documentElement.setAttribute('data-theme', 'clockwork');
    const storage = {
      getItem: (key: string) =>
        key === THEME_STORAGE_KEY ? 'neon-syndicate' : null,
    } as Storage;

    expect(readInitialThemeId({ document: doc, storage })).toBe('clockwork');
  });

  it('falls back to storage when data-theme is missing', () => {
    const doc = document.implementation.createHTMLDocument('');
    const storage = {
      getItem: (key: string) =>
        key === THEME_STORAGE_KEY ? 'sylvan-elven' : null,
    } as Storage;

    expect(readInitialThemeId({ document: doc, storage })).toBe(
      'sylvan-elven'
    );
  });
});
