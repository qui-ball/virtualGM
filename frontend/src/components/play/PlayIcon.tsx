import type { SVGProps } from 'react';
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
  | 'close'
  | 'swap';

type PlayIconProps = SVGProps<SVGSVGElement> & {
  name: PlayIconName;
};

/** Theme-aware SVG icon (stroke weight and shape vary per RPG preset). */
export function PlayIcon({ name, className, ...props }: PlayIconProps) {
  const { themeId } = useTheme();

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
