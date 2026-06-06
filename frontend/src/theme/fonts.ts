import { RPG_THEME_FONT_FAMILIES } from '@/theme/profiles';

function buildGoogleFontsUrl(): string {
  const families = RPG_THEME_FONT_FAMILIES.map((family) => {
    const weights =
      family === 'Teko'
        ? 'wght@400;500;600;700'
        : family === 'Cinzel' || family === 'Cinzel+Decorative'
          ? 'wght@500;600;700'
          : 'wght@400;500;600;700';
    return `family=${family}:${weights}`;
  });
  return `https://fonts.googleapis.com/css2?${families.join('&')}&display=swap`;
}

let rpgFontsLoadPromise: Promise<void> | null = null;

/** Load all RPG theme webfonts once (each preset uses a distinct stack). */
export function loadRpgThemeFonts(): Promise<void> {
  if (typeof document === 'undefined') {
    return Promise.resolve();
  }
  if (document.querySelector('link[data-vgm-rpg-fonts]')) {
    return Promise.resolve();
  }
  if (!rpgFontsLoadPromise) {
    rpgFontsLoadPromise = new Promise((resolve, reject) => {
      const link = document.createElement('link');
      link.rel = 'stylesheet';
      link.href = buildGoogleFontsUrl();
      link.setAttribute('data-vgm-rpg-fonts', 'true');
      link.onload = () => resolve();
      link.onerror = () => reject(new Error('Failed to load RPG theme fonts'));
      document.head.appendChild(link);
    });
  }
  return rpgFontsLoadPromise;
}
