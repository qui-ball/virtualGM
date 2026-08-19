import { useState } from 'react';
import { Link } from 'react-router-dom';
import type { CampaignListItem } from '@/lib/play/campaignLobby';
import {
  monogramFromName,
  playSearchParamsFromCampaign,
} from '@/lib/play/campaignLobby';
import { CampaignMetaLine } from '@/components/play/campaign/CampaignMetaLine';
import { PLAY_ROUTES } from '@/lib/play/routes';
import { isCaster } from '@/lib/play/stats';
import { PlayIcon } from '@/components/play/PlayIcon';
import { Pill } from '@/components/play/Pill';
import { VitalBar } from '@/components/play/VitalBar';
import { cn } from '@/lib/utils';

type ActiveCampaignCardProps = {
  campaign: CampaignListItem;
  className?: string;
  onAbandon?: (campaignId: string) => Promise<void>;
  onInspectCharacter?: () => void;
};

/** One in-progress playthrough — all lobby instances use this card equally. */
export function ActiveCampaignCard({
  campaign,
  className,
  onAbandon,
  onInspectCharacter,
}: ActiveCampaignCardProps) {
  const monogram = monogramFromName(campaign.characterName);
  const showMana =
    isCaster(campaign.characterClass) &&
    campaign.mana != null &&
    campaign.manaMax != null;
  const [confirmingEnd, setConfirmingEnd] = useState(false);
  const [ending, setEnding] = useState(false);

  const handleEnd = async () => {
    if (!onAbandon) return;
    setEnding(true);
    try {
      await onAbandon(campaign.id);
    } finally {
      setEnding(false);
      setConfirmingEnd(false);
    }
  };

  return (
    <section
      className={cn('play-panel space-y-3 p-4', className)}
      aria-label={campaign.title}
    >
      <div className="flex items-start justify-between gap-2">
        <span className="play-lbl">Campaign</span>
        <Pill variant="tint">
          Ch {campaign.chapter} · t {campaign.timeCurrent}/{campaign.timeMax}
        </Pill>
      </div>
      <h2 className="play-h-display text-xl">{campaign.title}</h2>
      <CampaignMetaLine campaign={campaign} />

      {onInspectCharacter ? (
        <button
          type="button"
          className="flex w-full items-center gap-3 text-left"
          onClick={onInspectCharacter}
          aria-label={`View ${campaign.characterName}`}
        >
          <span
            className="play-avat play-avat-you grid size-9 shrink-0 place-items-center text-sm"
            aria-hidden
          >
            {monogram}
          </span>
          <div className="min-w-0">
            <p className="truncate font-semibold text-[var(--ink)]">
              {campaign.characterName}
            </p>
            <p className="play-mono text-[0.625rem] tracking-widest text-[var(--ink-3)] uppercase">
              {campaign.classShort} · Lv {campaign.level}
            </p>
          </div>
          <span className="play-mono ml-auto shrink-0 text-[0.5625rem] tracking-widest text-[var(--ink-3)] uppercase">
            View
          </span>
        </button>
      ) : (
        <div className="flex items-center gap-3">
          <span
            className="play-avat play-avat-you grid size-9 shrink-0 place-items-center text-sm"
            aria-hidden
          >
            {monogram}
          </span>
          <div className="min-w-0">
            <p className="truncate font-semibold text-[var(--ink)]">
              {campaign.characterName}
            </p>
            <p className="play-mono text-[0.625rem] tracking-widest text-[var(--ink-3)] uppercase">
              {campaign.classShort} · Lv {campaign.level}
            </p>
          </div>
        </div>
      )}

      <div className="grid grid-cols-2 gap-3">
        <div>
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
        {showMana ? (
          <div>
            <div className="mb-1 flex justify-between">
              <span className="play-lbl">Mana</span>
              <span className="play-mono text-[0.6875rem] text-[var(--ink-3)]">
                {campaign.mana}/{campaign.manaMax}
              </span>
            </div>
            <VitalBar
              value={campaign.mana!}
              max={campaign.manaMax!}
              kind="mp"
              aria-label={`Mana ${campaign.mana} of ${campaign.manaMax}`}
            />
          </div>
        ) : (
          <div>
            <div className="mb-1 flex justify-between">
              <span className="play-lbl">Evasion</span>
              <span className="play-mono text-[0.6875rem] text-[var(--ink-3)]">
                {campaign.evasion}
              </span>
            </div>
            <p className="play-h-display text-lg leading-none">
              {campaign.evasion}
            </p>
          </div>
        )}
      </div>

      {campaign.pendingLevelUp ? (
        <Pill variant="solid" className="w-fit">
          ↑ Pending level-up
        </Pill>
      ) : null}

      <p className="text-sm text-[var(--ink-3)]">
        Last: {campaign.lastScene}
      </p>
      <Link
        to={`${PLAY_ROUTES.session}?${playSearchParamsFromCampaign(campaign)}`}
        className="play-btn-primary mt-2 flex w-full min-h-[44px] items-center justify-center gap-2"
      >
        <PlayIcon name="bolt" className="size-[18px]" />
        Continue
      </Link>

      {onAbandon ? (
        <div className="pt-1 text-center">
          {!confirmingEnd ? (
            <button
              type="button"
              className="play-mono text-[0.625rem] tracking-widest text-[var(--ink-3)] uppercase underline-offset-2 hover:text-[var(--bad)] hover:underline"
              onClick={() => setConfirmingEnd(true)}
            >
              End campaign
            </button>
          ) : (
            <div className="flex flex-wrap items-center justify-center gap-3">
              <span className="text-xs text-[var(--ink-3)]">
                Remove this playthrough?
              </span>
              <button
                type="button"
                className="play-mono text-[0.625rem] tracking-widest text-[var(--bad)] uppercase"
                disabled={ending}
                onClick={() => void handleEnd()}
              >
                {ending ? 'Ending…' : 'Confirm end'}
              </button>
              <button
                type="button"
                className="play-mono text-[0.625rem] tracking-widest text-[var(--ink-3)] uppercase"
                disabled={ending}
                onClick={() => setConfirmingEnd(false)}
              >
                Cancel
              </button>
            </div>
          )}
        </div>
      ) : null}
    </section>
  );
}
