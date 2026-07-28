import type { PlayIconName } from '@/components/play/PlayIcon';
import type { RpgThemeId } from '@/theme/registry';
import iconBoltStorm from '@/assets/ui/storm/icon-bolt-transparent.png';
import iconMenuStorm from '@/assets/ui/storm/icon-menu-transparent.png';

/** Optional raster replacements for SVG play icons (per theme pack). */
const THEME_ICON_ART: Partial<
  Record<RpgThemeId, Partial<Record<PlayIconName, string>>>
> = {
  storm: {
    bolt: iconBoltStorm,
    menu: iconMenuStorm,
  },
};

export function getThemeIconArt(
  themeId: RpgThemeId,
  name: PlayIconName,
): string | undefined {
  return THEME_ICON_ART[themeId]?.[name];
}
