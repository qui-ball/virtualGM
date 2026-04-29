import { normalizeThemeId } from './normalize-theme-id';
import { THEME_REGISTRY } from './registry';
import { useTheme } from './use-theme';

/**
 * Native theme picker (full Task 8 can replace with a richer control).
 * Keeps font injection + `data-theme` in sync via {@link useTheme}.
 */
export function ThemeSelect() {
  const { themeId, setTheme, fontLoadingSlow } = useTheme();

  return (
    <label className="flex max-w-[min(100%,200px)] flex-wrap items-center gap-2 text-xs text-muted-foreground">
      <span className="shrink-0">Theme</span>
      <select
        className="min-h-[36px] min-w-0 flex-1 rounded-md border border-input bg-background px-2 py-1 text-xs text-foreground"
        value={themeId}
        onChange={(e) => void setTheme(normalizeThemeId(e.target.value))}
        aria-busy={fontLoadingSlow || undefined}
        aria-label="UI theme preset"
      >
        {THEME_REGISTRY.map((t) => (
          <option key={t.id} value={t.id}>
            {t.label}
          </option>
        ))}
      </select>
      {fontLoadingSlow ? (
        <span className="w-full text-[10px] text-muted-foreground md:w-auto">
          Applying theme…
        </span>
      ) : null}
    </label>
  );
}
