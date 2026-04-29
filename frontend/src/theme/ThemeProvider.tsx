import {
  useCallback,
  useLayoutEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';

import { THEME_STORAGE_KEY } from './constants';
import { loadFontsForTheme } from './load-fonts';
import { normalizeThemeId } from './normalize-theme-id';
import type { ThemeId } from './theme-ids';
import { readInitialThemeId } from './read-initial-theme-id';
import { ThemeContext, type ThemeContextValue } from './theme-context';

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [themeId, setThemeIdState] = useState<ThemeId>(() =>
    readInitialThemeId()
  );
  const [fontLoading, setFontLoading] = useState(false);
  const [fontLoadingSlow, setFontLoadingSlow] = useState(false);

  useLayoutEffect(() => {
    void loadFontsForTheme(themeId);
  }, [themeId]);

  const setTheme = useCallback(async (next: ThemeId) => {
    const id = normalizeThemeId(next);
    const isChange = id !== themeId;
    if (isChange) {
      setFontLoading(true);
    }
    const slowTimer = window.setTimeout(() => {
      if (isChange) setFontLoadingSlow(true);
    }, 300);
    try {
      await loadFontsForTheme(id);
      document.documentElement.setAttribute('data-theme', id);
      try {
        localStorage.setItem(THEME_STORAGE_KEY, id);
      } catch {
        /* private mode */
      }
      setThemeIdState(id);
    } finally {
      window.clearTimeout(slowTimer);
      setFontLoadingSlow(false);
      if (isChange) setFontLoading(false);
    }
  }, [themeId]);

  const value = useMemo<ThemeContextValue>(
    () => ({ themeId, setTheme, fontLoading, fontLoadingSlow }),
    [themeId, setTheme, fontLoading, fontLoadingSlow]
  );

  return (
    <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>
  );
}
