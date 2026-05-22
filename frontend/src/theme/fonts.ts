const RPG_FONTS_URL =
  'https://fonts.googleapis.com/css2?family=Cinzel:wght@500;600;700&family=Inter:wght@400;500;600;700&family=JetBrains+Mono:wght@400;600&display=swap';

let rpgFontsLoadPromise: Promise<void> | null = null;

/** Load shared RPG theme webfonts once (all four presets use the same stacks). */
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
      link.href = RPG_FONTS_URL;
      link.setAttribute('data-vgm-rpg-fonts', 'true');
      link.onload = () => resolve();
      link.onerror = () => reject(new Error('Failed to load RPG theme fonts'));
      document.head.appendChild(link);
    });
  }
  return rpgFontsLoadPromise;
}
