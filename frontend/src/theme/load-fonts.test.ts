import { afterEach, describe, expect, it, vi } from 'vitest';

import { FONT_LINK_DATA_ATTR } from './constants';
import { loadFontsForTheme } from './load-fonts';
import { getThemeRegistryEntry } from './registry';

function emptyDoc(): Document {
  return document.implementation.createHTMLDocument('test');
}

describe('loadFontsForTheme', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('does not inject a stylesheet for dark-fantasy (system stack)', async () => {
    const doc = emptyDoc();
    await loadFontsForTheme('dark-fantasy', { document: doc });
    const links = doc.head.querySelectorAll(`link[${FONT_LINK_DATA_ATTR}]`);
    expect(links.length).toBe(0);
  });

  it('injects one Google Fonts stylesheet when the theme defines a URL', async () => {
    const doc = emptyDoc();
    const entry = getThemeRegistryEntry('neon-syndicate');
    expect(entry.googleFontsStylesheetUrl).toBeDefined();
    expect(entry.googleFontsStylesheetUrl).toContain('display=swap');

    await loadFontsForTheme('neon-syndicate', { document: doc });

    const link = doc.head.querySelector(
      `link[rel="stylesheet"][${FONT_LINK_DATA_ATTR}="neon-syndicate"]`
    );
    expect(link).toBeTruthy();
    expect(link?.getAttribute('href')).toBe(entry.googleFontsStylesheetUrl);
  });

  it('does not inject a duplicate link for the same theme', async () => {
    const doc = emptyDoc();
    await loadFontsForTheme('sylvan-elven', { document: doc });
    await loadFontsForTheme('sylvan-elven', { document: doc });
    const links = doc.head.querySelectorAll(
      `link[${FONT_LINK_DATA_ATTR}="sylvan-elven"]`
    );
    expect(links.length).toBe(1);
  });

  it('allows different themes to each have one stylesheet link', async () => {
    const doc = emptyDoc();
    await loadFontsForTheme('sylvan-elven', { document: doc });
    await loadFontsForTheme('clockwork', { document: doc });
    expect(
      doc.head.querySelectorAll(`link[${FONT_LINK_DATA_ATTR}]`).length
    ).toBe(2);
  });

  it('rejects with AbortError when aborted before insert', async () => {
    const doc = emptyDoc();
    const ac = new AbortController();
    ac.abort();
    await expect(
      loadFontsForTheme('neon-syndicate', { document: doc, signal: ac.signal })
    ).rejects.toMatchObject({ name: 'AbortError' });
  });
});
