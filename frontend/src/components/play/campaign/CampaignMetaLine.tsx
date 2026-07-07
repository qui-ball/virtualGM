import { formatCampaignAudience } from '@/lib/play/campaignMeta';
import type { CampaignListItem } from '@/lib/play/campaignLobby';
import { Pill } from '@/components/play/Pill';
import { cn } from '@/lib/utils';

type CampaignMetaLineProps = {
  campaign: Pick<
    CampaignListItem,
    | 'recommendedPlayers'
    | 'levelMin'
    | 'levelMax'
    | 'avgLevel'
    | 'soloMode'
  >;
  className?: string;
  showSoloBadge?: boolean;
};

export function CampaignMetaLine({
  campaign,
  className,
  showSoloBadge = true,
}: CampaignMetaLineProps) {
  return (
    <div className={cn('flex flex-wrap items-center gap-2', className)}>
      <p className="play-mono text-[0.625rem] tracking-wide text-[var(--ink-3)]">
        {formatCampaignAudience(campaign)}
      </p>
      {showSoloBadge && campaign.soloMode ? (
        <Pill variant="tint" className="text-[0.625rem]">
          Solo mode
        </Pill>
      ) : null}
    </div>
  );
}
