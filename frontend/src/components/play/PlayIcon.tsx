import type { SVGProps } from 'react';
import { getThemeIconArt } from '@/theme/icon-art';
import { getThemeIconPath } from '@/theme/icon-paths';
import { useTheme } from '@/theme/useTheme';
import { cn } from '@/lib/utils';

export type PlayIconName =
  | 'bolt'
  | 'shield'
  | 'swords'
  | 'scroll'
  | 'home'
  | 'menu'
  | 'send'
  | 'close';

type PlayIconProps = SVGProps<SVGSVGElement> & {
  name: PlayIconName;
};

/** Theme-aware icon — raster art when the pack provides it, else SVG paths. */
export function PlayIcon({ name, className, ...props }: PlayIconProps) {
  const { themeId } = useTheme();
  const artSrc = getThemeIconArt(themeId, name);

  if (artSrc) {
    return (
      <img
        src={artSrc}
        alt=""
        aria-hidden
        draggable={false}
        className={cn('size-[18px] shrink-0 object-contain', className)}
      />
    );
  }

  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      className={cn('size-[18px] shrink-0', className)}
      aria-hidden
      {...props}
    >
      {getThemeIconPath(themeId, name)}
    </svg>
  );
}
