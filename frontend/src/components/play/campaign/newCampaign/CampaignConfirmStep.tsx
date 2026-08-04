import { useId } from 'react';
import type {
  CampaignTemplateSummary,
  CreateCharacterDraft,
  PrebuiltCharacterSummary,
} from '@/types';
import type { FlowGender } from '@/lib/play/newCampaignFlow';
import { resolvedPrebuiltName } from '@/lib/play/newCampaignFlow';
import { formatCampaignAudience } from '@/lib/play/campaignMeta';
import { OnboardingCharacterCard } from '@/components/play/campaign/newCampaign/OnboardingCharacterCard';
import { formatStatModifier, STAT_KEYS } from '@/lib/play/characterWizard';
import { cn } from '@/lib/utils';

type CampaignConfirmStepProps = {
  template: CampaignTemplateSummary;
  prebuilt?: PrebuiltCharacterSummary | null;
  draft?: CreateCharacterDraft | null;
  /** Friendly package label for create-path summary. */
  packageLabel?: string | null;
  /** Starting gear lines (weapon/armor/inventory). */
  equipment?: string[];
  gender: FlowGender;
  soloMode: boolean;
  onSoloModeChange: (solo: boolean) => void;
  starting?: boolean;
  error?: string | null;
};

export function CampaignConfirmStep({
  template,
  prebuilt,
  draft,
  packageLabel,
  equipment = [],
  gender,
  soloMode,
  onSoloModeChange,
  starting,
  error,
}: CampaignConfirmStepProps) {
  const soloToggleId = useId();
  const name = draft
    ? draft.name
    : prebuilt
      ? resolvedPrebuiltName(prebuilt, gender)
      : 'Hero';
  const classId = draft?.class_id ?? prebuilt?.class_id ?? 'warrior';
  const raceId = draft?.race_id ?? prebuilt?.race_id ?? null;
  const displayGender = draft?.gender ?? gender;
  const level = prebuilt?.level ?? 1;
  const hook = prebuilt?.hook ?? null;
  const detailParts: string[] = [];
  if (draft) {
    detailParts.push(
      `Stats: ${STAT_KEYS.map((k) => `${k} ${formatStatModifier(draft.stats[k])}`).join(' · ')}`,
    );
    if (draft.spells_known?.length) {
      detailParts.push(`Spells: ${draft.spells_known.join(', ')}`);
    }
  }

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <p className="play-lbl">Summary</p>
        <OnboardingCharacterCard
          name={name}
          classId={classId}
          gender={displayGender}
          raceId={raceId}
          level={level}
          hook={hook}
          detail={detailParts.length ? detailParts.join(' · ') : null}
          packageLabel={packageLabel}
          equipment={equipment}
          selected
        />
        <div className="play-panel space-y-1 px-4 py-3">
          <h3 className="play-h-display text-base">{template.name}</h3>
          <p className="play-mono text-[0.625rem] text-[var(--ink-3)]">
            {formatCampaignAudience({
              recommendedPlayers: template.recommended_players,
              levelMin: template.level_min,
              levelMax: template.level_max,
              avgLevel: template.avg_level ?? undefined,
            })}
          </p>
        </div>
      </div>

      <section className="play-panel space-y-2 p-4">
        <div className="flex items-center justify-between gap-3">
          <h2 className="play-h-display text-lg">Solo mode</h2>
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium text-[var(--ink)]">
              {soloMode ? 'On' : 'Off'}
            </span>
            <button
              id={soloToggleId}
              type="button"
              role="switch"
              aria-checked={soloMode}
              aria-label={`Solo mode ${soloMode ? 'on' : 'off'}`}
              disabled={starting}
              className="shrink-0"
              onClick={() => onSoloModeChange(!soloMode)}
            >
              <span
                className={cn(
                  'play-switch-track',
                  soloMode && 'play-switch-track-on',
                )}
                aria-hidden
              >
                <span className="play-switch-thumb" />
              </span>
            </button>
          </div>
        </div>
        <p className="text-sm text-[var(--ink-3)]">
          Play alone — the campaign adapts its difficulty for a single
          adventurer.
        </p>
      </section>

      {error ? (
        <p className="text-sm text-[var(--bad)]" role="alert">
          {error}
        </p>
      ) : null}
    </div>
  );
}
