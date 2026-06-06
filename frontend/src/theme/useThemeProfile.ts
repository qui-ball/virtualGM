import { getRpgThemeProfile } from '@/theme/profiles';
import { useTheme } from '@/theme/useTheme';

/** Active theme profile (colour tokens + fonts + glyphs + icon set). */
export function useThemeProfile() {
  const { themeId } = useTheme();
  return getRpgThemeProfile(themeId);
}
