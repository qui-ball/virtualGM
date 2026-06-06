import { Link } from 'react-router-dom';
import type { CampaignListItem } from '@/lib/play/campaignLobby';
import { PLAY_ROUTES } from '@/lib/play/routes';
import { PlayIcon } from '@/components/play/PlayIcon';
import { Pill } from '@/components/play/Pill';
import { cn } from '@/lib/utils';

type ActiveCampaignCardProps = {
  campaign: CampaignListItem;
  className?: string;
};

export function ActiveCampaignCard({
  campaign,
  className,
}: ActiveCampaignCardProps) {
  return (
    <section
      className={cn('play-panel play-panel-glow space-y-3 p-4', className)}
      aria-label="Active campaign"
    >
      <div className="flex items-start justify-between gap-2">
        <span className="play-lbl">Active campaign</span>
        <Pill variant="tint">
          Ch {campaign.chapter} · t {campaign.timeCurrent}/{campaign.timeMax}
        </Pill>
      </div>
      <h2 className="play-h-display text-xl">{campaign.title}</h2>
      <p className="text-sm text-[var(--ink-3)]">
        Last: {campaign.lastScene}
      </p>
      <Link
        to={`${PLAY_ROUTES.session}?${new URLSearchParams({
          campaignId: campaign.id,
          ...(campaign.characterName
            ? { characterName: campaign.characterName }
            : {}),
        }).toString()}`}
        className="play-btn-primary mt-2 flex w-full min-h-[44px] items-center justify-center gap-2"
      >
        <PlayIcon name="bolt" className="size-[18px]" />
        Resume session
      </Link>
    </section>
  );
}
