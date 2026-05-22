import { RPG_THEMES } from '@/theme/registry';
import { useTheme } from '@/theme/useTheme';
import { SegmentedControl } from '@/components/play/SegmentedControl';
import { cn } from '@/lib/utils';

type ThemePickerRpgProps = {
  className?: string;
  /** `play` uses RPG wireframe segmented control on campaign lobby. */
  variant?: 'default' | 'play';
};

/** Four-theme picker for /campaign (storm · necropolis · obsidian · mithril). */
export function ThemePickerRpg({
  className,
  variant = 'default',
}: ThemePickerRpgProps) {
  const { themeId, setThemeId } = useTheme();

  const options = RPG_THEMES.map((t) => ({ id: t.id, label: t.label }));

  if (variant === 'play') {
    return (
      <section className={cn('space-y-2', className)} aria-label="Theme">
        <SegmentedControl
          options={options}
          value={themeId}
          onChange={setThemeId}
          aria-label="RPG Companion theme"
        />
        <ThemePreviewStrip />
      </section>
    );
  }

  return (
    <section className={cn('space-y-3', className)} aria-label="Theme">
      <div>
        <p className="text-xs font-medium uppercase tracking-widest text-muted-foreground">
          Theme
        </p>
        <p className="text-sm text-muted-foreground">
          Palette only — layout stays the same across themes.
        </p>
      </div>
      <div
        className="grid grid-cols-2 gap-2 sm:grid-cols-4"
        role="radiogroup"
        aria-label="RPG Companion theme"
      >
        {RPG_THEMES.map((t) => {
          const selected = themeId === t.id;
          return (
            <button
              key={t.id}
              type="button"
              role="radio"
              aria-checked={selected}
              onClick={() => setThemeId(t.id)}
              className={cn(
                'flex min-h-[44px] flex-col items-start justify-center rounded-md border px-3 py-2 text-left transition-colors',
                selected
                  ? 'border-primary bg-primary/10 text-foreground ring-2 ring-ring'
                  : 'border-border bg-card text-foreground hover:border-primary/50',
              )}
            >
              <span className="font-semibold">{t.label}</span>
              <span className="text-xs text-muted-foreground">{t.tag}</span>
            </button>
          );
        })}
      </div>
      <ThemePreviewStrip />
    </section>
  );
}

function ThemePreviewStrip() {
  return (
    <div className="play-panel p-3">
      <p className="play-lbl mb-2">Preview</p>
      <div className="flex flex-wrap gap-2">
        <span
          className="play-theme-swatch min-w-[3rem] flex-1"
          style={{ background: 'var(--accent)' }}
          title="Accent"
        />
        <span
          className="play-theme-swatch min-w-[3rem] flex-1"
          style={{ background: 'var(--hp)' }}
          title="HP"
        />
        <span
          className="play-theme-swatch min-w-[3rem] flex-1"
          style={{ background: 'var(--mp)' }}
          title="Mana"
        />
        <span
          className="play-theme-swatch min-w-[3rem] flex-1"
          style={{ background: 'var(--panel)' }}
          title="Panel"
        />
      </div>
    </div>
  );
}
