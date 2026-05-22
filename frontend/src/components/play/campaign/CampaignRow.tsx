import type { CampaignListItem } from '@/lib/play/campaignLobby';
import { Pill } from '@/components/play/Pill';
import { cn } from '@/lib/utils';

type CampaignRowProps = {
  campaign: CampaignListItem;
  onOpen?: () => void;
  className?: string;
};

export function CampaignRow({ campaign, onOpen, className }: CampaignRowProps) {
  return (
    <article
      className={cn('play-panel px-3.5 py-3', className)}
      aria-label={campaign.title}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <h3 className="truncate font-semibold text-[var(--ink)]">
            {campaign.title}
          </h3>
          <p className="play-mono mt-0.5 text-[0.625rem] tracking-widest text-[var(--ink-3)] uppercase">
            {campaign.characterName} · {campaign.classShort} · Lv{' '}
            {campaign.level}
          </p>
        </div>
        <button
          type="button"
          className="play-btn-pill-wrap shrink-0"
          onClick={onOpen}
          disabled={!onOpen}
          title={onOpen ? 'Open campaign' : 'Coming soon'}
        >
          <Pill>{onOpen ? 'Open' : 'Soon'}</Pill>
        </button>
      </div>
      <p className="play-mono mt-1 text-[0.625rem] text-[var(--ink-3)]">
        Ch {campaign.chapter} · t {campaign.timeCurrent}/{campaign.timeMax}
      </p>
      {campaign.pendingLevelUp ? (
        <Pill variant="solid" className="mt-2 w-fit text-[0.625rem]">
          ↑ Pending level-up
        </Pill>
      ) : null}
    </article>
  );
}
