import type { PlayGlyphName } from '@/theme/profiles';
import { useThemeProfile } from '@/theme/useThemeProfile';
import { cn } from '@/lib/utils';

type PlayGlyphProps = {
  name: PlayGlyphName;
  className?: string;
};

/** Theme-aware text glyph (menus, rests, composer actions). */
export function PlayGlyph({ name, className }: PlayGlyphProps) {
  const profile = useThemeProfile();
  return (
    <span className={cn(className)} aria-hidden>
      {profile.glyphs[name]}
    </span>
  );
}
