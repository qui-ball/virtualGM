import type { CampaignListItem } from '@/lib/play/campaignLobby';
import { ActiveCampaignCard } from '@/components/play/campaign/ActiveCampaignCard';
import { ThemePickerRpg } from '@/theme';
import { cn } from '@/lib/utils';

type CampaignLobbyProps = {
  campaigns: CampaignListItem[];
  error?: string | null;
  onNewCampaign: () => void;
  onRetry?: () => void;
  onAbandonCampaign?: (campaignId: string) => Promise<void>;
  className?: string;
};

export function CampaignLobby({
  campaigns,
  error,
  onNewCampaign,
  onRetry,
  onAbandonCampaign,
  className,
}: CampaignLobbyProps) {
  const empty = !error && campaigns.length === 0;

  return (
    <div className={cn('relative flex min-h-0 flex-1 flex-col', className)}>
      <div className="flex min-h-[52px] items-center border-b border-[var(--panel-edge)] px-4">
        <span className="play-lbl">Campaigns</span>
      </div>

      <div className="play-lobby-scroll min-h-0 flex-1">
        {error ? (
          <section
            className="play-panel space-y-3 p-4"
            aria-label="Campaign load error"
            role="alert"
          >
            <span className="play-lbl text-[var(--bad)]">Could not load</span>
            <h2 className="play-h-display text-xl">Campaigns unavailable</h2>
            <p className="text-sm text-[var(--ink-3)]">{error}</p>
            {onRetry ? (
              <button
                type="button"
                className="play-btn-primary w-full min-h-[44px]"
                onClick={onRetry}
              >
                Retry
              </button>
            ) : null}
          </section>
        ) : null}

        {empty ? (
          <section
            className="play-panel play-panel-glow space-y-3 p-4"
            aria-label="No campaigns"
          >
            <span className="play-lbl">Your playthroughs</span>
            <h2 className="play-h-display text-xl">No campaigns yet</h2>
            <p className="text-sm text-[var(--ink-3)]">
              Start a campaign to begin play. Your progress saves so you can
              continue later.
            </p>
            <button
              type="button"
              className="play-btn-primary mt-2 flex w-full min-h-[44px] items-center justify-center gap-2"
              onClick={onNewCampaign}
            >
              + New Campaign
            </button>
          </section>
        ) : null}

        {!error && campaigns.length > 0 ? (
          <div className="flex flex-col gap-3">
            {campaigns.map((c) => (
              <ActiveCampaignCard
                key={c.id}
                campaign={c}
                onAbandon={onAbandonCampaign}
              />
            ))}
            <button
              type="button"
              className="play-btn-ghost w-full min-h-[44px]"
              onClick={onNewCampaign}
            >
              + New Campaign
            </button>
          </div>
        ) : null}

        <div className="hidden" aria-hidden>
          <div className="play-rune-divider">
            <span>Theme</span>
          </div>

          <ThemePickerRpg variant="play" />
        </div>
      </div>
    </div>
  );
}
