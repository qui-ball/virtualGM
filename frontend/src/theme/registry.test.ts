import { describe, expect, it } from 'vitest';
import {
  DEFAULT_RPG_THEME_ID,
  isRpgThemeId,
  RPG_THEME_IDS,
  RPG_THEMES,
} from '@/theme/registry';

describe('RPG theme registry', () => {
  it('exposes exactly four themes', () => {
    expect(RPG_THEME_IDS).toHaveLength(4);
    expect(RPG_THEMES).toHaveLength(4);
    expect(RPG_THEME_IDS).toEqual([
      'storm',
      'necropolis',
      'obsidian',
      'mithril',
    ]);
  });

  it('validates theme ids', () => {
    expect(isRpgThemeId('storm')).toBe(true);
    expect(isRpgThemeId('dragonfire')).toBe(false);
    expect(isRpgThemeId('')).toBe(false);
  });

  it('defaults to storm', () => {
    expect(DEFAULT_RPG_THEME_ID).toBe('storm');
  });
});
