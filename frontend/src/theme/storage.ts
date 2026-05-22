import {
  DEFAULT_RPG_THEME_ID,
  isRpgThemeId,
  THEME_STORAGE_KEY,
  type RpgThemeId,
} from '@/theme/registry';

export function readStoredTheme(
  storage: Pick<Storage, 'getItem'> | null = typeof globalThis !== 'undefined' &&
    'localStorage' in globalThis
    ? globalThis.localStorage
    : null,
): RpgThemeId {
  if (!storage) {
    return DEFAULT_RPG_THEME_ID;
  }
  const stored = storage.getItem(THEME_STORAGE_KEY);
  if (stored && isRpgThemeId(stored)) {
    return stored;
  }
  return DEFAULT_RPG_THEME_ID;
}
