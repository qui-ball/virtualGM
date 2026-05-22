import type { RpgThemeId } from '@/theme/registry';

/** Apply RPG theme tokens to `<html>` (Tailwind `dark` + `data-theme`). */
export function applyThemeToDocument(themeId: RpgThemeId) {
  document.documentElement.setAttribute('data-theme', themeId);
  document.documentElement.classList.add('dark');
}
