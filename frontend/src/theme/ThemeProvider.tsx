import {
  useCallback,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import { loadRpgThemeFonts } from '@/theme/fonts';
import { THEME_STORAGE_KEY, type RpgThemeId } from '@/theme/registry';
import { applyThemeToDocument } from '@/theme/document';
import { readStoredTheme } from '@/theme/storage';
import { ThemeContext, type ThemeContextValue } from '@/theme/theme-context';

type ThemeProviderProps = {
  children: ReactNode;
};

export function ThemeProvider({ children }: ThemeProviderProps) {
  const [themeId, setThemeIdState] = useState<RpgThemeId>(readStoredTheme);
  const [fontsReady, setFontsReady] = useState(false);

  useEffect(() => {
    applyThemeToDocument(themeId);
  }, [themeId]);

  useEffect(() => {
    let cancelled = false;
    void loadRpgThemeFonts()
      .then(() => {
        if (!cancelled) {
          setFontsReady(true);
        }
      })
      .catch(() => {
        if (!cancelled) {
          setFontsReady(true);
        }
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const setThemeId = useCallback((id: RpgThemeId) => {
    setThemeIdState(id);
    localStorage.setItem(THEME_STORAGE_KEY, id);
    applyThemeToDocument(id);
  }, []);

  const value = useMemo<ThemeContextValue>(
    () => ({ themeId, setThemeId, fontsReady }),
    [themeId, setThemeId, fontsReady],
  );

  return (
    <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>
  );
}
