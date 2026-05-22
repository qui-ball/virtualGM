import { createContext } from 'react';
import type { RpgThemeId } from '@/theme/registry';

export type ThemeContextValue = {
  themeId: RpgThemeId;
  setThemeId: (id: RpgThemeId) => void;
  fontsReady: boolean;
};

export const ThemeContext = createContext<ThemeContextValue | null>(null);
