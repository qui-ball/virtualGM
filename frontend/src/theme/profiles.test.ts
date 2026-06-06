import { describe, expect, it } from 'vitest';
import { RPG_THEME_IDS } from '@/theme/registry';
import { getRpgThemeProfile, listRpgThemeProfiles } from '@/theme/profiles';

describe('RPG theme profiles', () => {
  it('defines a profile for every registered theme', () => {
    for (const id of RPG_THEME_IDS) {
      const profile = getRpgThemeProfile(id);
      expect(profile.id).toBe(id);
      expect(profile.fonts.display).toBeTruthy();
      expect(profile.fonts.body).toBeTruthy();
      expect(profile.fonts.mono).toBeTruthy();
      expect(profile.glyphs.freeroll).toBeTruthy();
      expect(profile.conditionIcons.poisoned).toBeTruthy();
      expect(profile.signatureIcons.length).toBeGreaterThanOrEqual(3);
    }
  });

  it('uses distinct display fonts across themes', () => {
    const displayFonts = new Set(
      listRpgThemeProfiles().map((p) => p.fontLabels.display),
    );
    expect(displayFonts.size).toBe(RPG_THEME_IDS.length);
  });
});
