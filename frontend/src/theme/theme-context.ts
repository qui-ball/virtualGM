import { createContext } from 'react';

import type { ThemeId } from './theme-ids';

export type ThemeContextValue = {
  themeId: ThemeId;
  setTheme: (id: ThemeId) => Promise<void>;
  fontLoading: boolean;
  fontLoadingSlow: boolean;
};

export const ThemeContext = createContext<ThemeContextValue | null>(null);
