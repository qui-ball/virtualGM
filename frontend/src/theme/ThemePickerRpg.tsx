import { PlayIcon } from '@/components/play/PlayIcon';
import { RPG_THEMES } from '@/theme/registry';
import { getRpgThemeProfile } from '@/theme/profiles';
import { useTheme } from '@/theme/useTheme';
import { SegmentedControl } from '@/components/play/SegmentedControl';
import { cn } from '@/lib/utils';

type ThemePickerRpgProps = {
  className?: string;
  /** `play` uses RPG wireframe segmented control on campaign lobby. */
  variant?: 'default' | 'play';
};

/** RPG theme picker — colour, typography, and icon set per setting. */
export function ThemePickerRpg({
  className,
  variant = 'default',
}: ThemePickerRpgProps) {
  const { themeId, setThemeId } = useTheme();
  const activeProfile = getRpgThemeProfile(themeId);

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
        <ThemePreviewStrip profile={activeProfile} />
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
          Colour, type, and icons adapt to each setting — layout stays the same.
        </p>
      </div>
      <div
        className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-5"
        role="radiogroup"
        aria-label="RPG Companion theme"
      >
        {RPG_THEMES.map((t) => {
          const selected = themeId === t.id;
          const profile = getRpgThemeProfile(t.id);
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
              <span className="mt-1 text-[0.625rem] leading-snug text-muted-foreground">
                {profile.fontLabels.display} · {profile.fontLabels.body}
              </span>
            </button>
          );
        })}
      </div>
      <ThemePreviewStrip profile={activeProfile} />
    </section>
  );
}

function ThemePreviewStrip({
  profile,
}: {
  profile: ReturnType<typeof getRpgThemeProfile>;
}) {
  return (
    <div className="play-panel space-y-3 p-3">
      <div>
        <p className="play-lbl mb-1">Preview</p>
        <p className="text-xs leading-snug text-[var(--ink-3)]">{profile.blurb}</p>
      </div>

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

      <div className="grid gap-2 sm:grid-cols-2">
        <div className="rounded-[var(--r-sm)] border border-[var(--panel-edge)] bg-[var(--bg-1)] px-2.5 py-2">
          <p className="play-lbl mb-1">Type</p>
          <p className="play-h-display text-sm">Adventurer</p>
          <p className="mt-1 text-xs text-[var(--ink-2)]">
            Body sample — {profile.fontLabels.body}
          </p>
        </div>
        <div className="rounded-[var(--r-sm)] border border-[var(--panel-edge)] bg-[var(--bg-1)] px-2.5 py-2">
          <p className="play-lbl mb-1">Icons & glyphs</p>
          <div className="flex flex-wrap items-center gap-2 text-[var(--accent)]">
            {profile.signatureIcons.map((name) => (
              <PlayIcon key={name} name={name} className="size-5" />
            ))}
            <span className="text-base text-[var(--ink-2)]">
              {profile.glyphs.freeroll}
              {profile.glyphs.cast}
              {profile.glyphs.shortrest}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
