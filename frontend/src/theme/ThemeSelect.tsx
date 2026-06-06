import { isRpgThemeId, RPG_THEMES } from '@/theme/registry';
import { useTheme } from '@/theme/useTheme';
import { cn } from '@/lib/utils';

type ThemeSelectProps = {
  className?: string;
  /** Compact label for narrow header slots */
  compact?: boolean;
};

/** Header / toolbar theme dropdown (RPG presets). */
export function ThemeSelect({ className, compact = false }: ThemeSelectProps) {
  const { themeId, setThemeId } = useTheme();

  return (
    <label
      className={cn(
        'flex min-h-[44px] items-center gap-2 text-sm text-[var(--ink)]',
        className,
      )}
    >
      {!compact ? (
        <span className="hidden text-[var(--ink-3)] sm:inline">Theme</span>
      ) : null}
      <select
        value={themeId}
        onChange={(e) => {
          const next = e.target.value;
          if (isRpgThemeId(next)) {
            setThemeId(next);
          }
        }}
        aria-label="Select theme"
        className={cn(
          'play-theme-select min-h-[44px] cursor-pointer px-2 py-1.5 text-sm',
          compact ? 'max-w-[7.5rem]' : 'min-w-[8.5rem]',
        )}
      >
        {RPG_THEMES.map((t) => (
          <option key={t.id} value={t.id}>
            {t.label}
          </option>
        ))}
      </select>
    </label>
  );
}
