import type { CampaignTemplateSummary } from '@/types';
import { formatCampaignAudience } from '@/lib/play/campaignMeta';
import { cn } from '@/lib/utils';

type CampaignTemplatePickerProps = {
  templates: CampaignTemplateSummary[];
  selectedSlug: string | null;
  loading?: boolean;
  error?: string | null;
  onSelect: (template: CampaignTemplateSummary) => void;
};

export function CampaignTemplatePicker({
  templates,
  selectedSlug,
  loading,
  error,
  onSelect,
}: CampaignTemplatePickerProps) {
  if (loading) {
    return (
      <p className="text-sm text-[var(--ink-3)]">Loading campaigns…</p>
    );
  }

  if (error) {
    return (
      <p className="text-sm text-[var(--bad)]" role="alert">
        {error}
      </p>
    );
  }

  if (!templates.length) {
    return (
      <p className="text-sm text-[var(--ink-3)]">
        No campaign templates available.
      </p>
    );
  }

  return (
    <div className="flex flex-col gap-3" role="listbox" aria-label="Campaign templates">
      {templates.map((t) => {
        const selected = t.slug === selectedSlug;
        return (
          <button
            key={t.id}
            type="button"
            role="option"
            aria-selected={selected}
            className={cn(
              'play-select-card w-full min-h-[44px] space-y-2 p-4 text-left',
              selected && 'play-select-card-on',
            )}
            onClick={() => onSelect(t)}
          >
            <div className="flex items-start justify-between gap-2">
              <h2 className="play-h-display text-lg">{t.name}</h2>
              {selected ? (
                <span className="play-select-card-badge shrink-0">Selected</span>
              ) : null}
            </div>
            {t.description ? (
              <p className="text-sm text-[var(--ink-3)]">{t.description}</p>
            ) : null}
            <p className="play-mono text-[0.625rem] text-[var(--ink-3)]">
              {formatCampaignAudience({
                recommendedPlayers: t.recommended_players,
                levelMin: t.level_min,
                levelMax: t.level_max,
                avgLevel: t.avg_level ?? undefined,
              })}
              {' · '}
              {t.genre}
            </p>
          </button>
        );
      })}
    </div>
  );
}
