import type { CampaignListItem } from '@/lib/play/campaignLobby';
import {
  canDeleteInactiveCharacter,
  characterInactiveLabel,
  characterRosterStatus,
  portraitGenderFromCampaign,
} from '@/lib/play/campaignLobby';
import { ClassGenderPortrait } from '@/components/play/campaign/newCampaign/ClassGenderPortrait';
import { Pill } from '@/components/play/Pill';
import { VitalBar } from '@/components/play/VitalBar';
import { cn } from '@/lib/utils';

type CharacterRosterCardProps = {
  campaign: CampaignListItem;
  onInspect: () => void;
  onRequestDelete?: () => void;
  className?: string;
};

/** Lobby tile for one playthrough hero — inspect, and delete when archived. */
export function CharacterRosterCard({
  campaign,
  onInspect,
  onRequestDelete,
  className,
}: CharacterRosterCardProps) {
  const gender = portraitGenderFromCampaign(campaign);
  const status = characterRosterStatus(campaign);
  const inactive = status !== 'active';
  const inactiveLabel = inactive ? characterInactiveLabel(campaign) : null;
  const canDelete = Boolean(onRequestDelete) && canDeleteInactiveCharacter(campaign);

  return (
    <div
      className={cn(
        'play-select-card relative flex w-full items-stretch gap-3 text-left',
        inactive && 'play-select-card-inactive',
        className,
      )}
    >
      <button
        type="button"
        className="flex min-w-0 flex-1 items-stretch gap-3 text-left"
        onClick={onInspect}
        aria-label={
          inactiveLabel
            ? `View ${campaign.characterName}, ${inactiveLabel}, ${campaign.classShort} in ${campaign.title}`
            : `View ${campaign.characterName}, ${campaign.classShort} in ${campaign.title}`
        }
      >
        <ClassGenderPortrait
          classId={campaign.characterClass}
          gender={gender}
          className={cn(
            'w-16 min-h-[5.5rem] self-stretch',
            inactive && 'grayscale opacity-80',
          )}
        />
        <div className="min-w-0 flex-1 space-y-1.5 py-0.5">
          <h2 className="play-h-display truncate text-lg">
            {campaign.characterName}
          </h2>
          <div className="flex items-center justify-between gap-2">
            <span className="play-lbl min-w-0 truncate">
              {campaign.classShort} · Lv {campaign.level}
            </span>
            {inactiveLabel ? (
              <Pill
                variant={
                  status === 'fallen'
                    ? 'danger'
                    : status === 'completed'
                      ? 'tint'
                      : 'default'
                }
                className="shrink-0"
              >
                {inactiveLabel}
              </Pill>
            ) : null}
          </div>
          <p className="play-mono text-[0.625rem] tracking-wide text-[var(--ink-3)]">
            {campaign.title} · Ch {campaign.chapter}
          </p>
          <div className={cn(canDelete && 'pr-10')}>
            <div className="mb-1 flex justify-between">
              <span className="play-lbl">HP</span>
              <span className="play-mono text-[0.6875rem] text-[var(--ink-3)]">
                {campaign.hp}/{campaign.hpMax}
              </span>
            </div>
            <VitalBar
              value={campaign.hp}
              max={campaign.hpMax}
              kind="hp"
              aria-label={`Hit points ${campaign.hp} of ${campaign.hpMax}`}
            />
          </div>
        </div>
      </button>
      {canDelete ? (
        <button
          type="button"
          className="absolute bottom-2 right-2 grid size-9 place-items-center rounded-[8px] border border-[var(--panel-edge)] text-[var(--ink-3)] hover:border-[var(--bad)] hover:text-[var(--bad)]"
          aria-label={`Delete ${campaign.characterName}`}
          onClick={onRequestDelete}
        >
          <TrashIcon />
        </button>
      ) : null}
    </div>
  );
}

function TrashIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      className="size-4 shrink-0"
      aria-hidden
    >
      <path
        d="M5 7h14M10 7V5h4v2M8 7v12a1 1 0 0 0 1 1h6a1 1 0 0 0 1-1V7"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M10 11v6M14 11v6"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinecap="round"
      />
    </svg>
  );
}
