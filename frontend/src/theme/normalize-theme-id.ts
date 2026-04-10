import { DEFAULT_THEME_ID, type ThemeId, isThemeId } from './theme-ids';

/**
 * Maps legacy client/DB values to a canonical {@link ThemeId}.
 * Unknown ids fall back to {@link DEFAULT_THEME_ID}.
 */
export function normalizeThemeId(raw: string | null | undefined): ThemeId {
  const id = typeof raw === 'string' ? raw.trim() : '';
  if (!id) return DEFAULT_THEME_ID;
  if (id === 'dark') return 'dark-fantasy';
  if (isThemeId(id)) return id;
  return DEFAULT_THEME_ID;
}
