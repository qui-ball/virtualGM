import { useState } from 'react';
import {
  activeCampaigns,
  type CampaignListItem,
} from '@/lib/play/campaignLobby';
import { ActiveCampaignCard } from '@/components/play/campaign/ActiveCampaignCard';
import { CharacterDossier } from '@/components/play/campaign/CharacterDossier';
import { CharacterGallery } from '@/components/play/campaign/CharacterGallery';
import { DeleteCharacterDialog } from '@/components/play/campaign/DeleteCharacterDialog';
import { ThemePickerRpg } from '@/theme';
import { SegmentedControl } from '@/components/play/SegmentedControl';
import { cn } from '@/lib/utils';

type LobbyTab = 'campaigns' | 'characters';

const LOBBY_TABS: { id: LobbyTab; label: string }[] = [
  { id: 'campaigns', label: 'Campaigns' },
  { id: 'characters', label: 'Characters' },
];

type CampaignLobbyProps = {
  campaigns: CampaignListItem[];
  error?: string | null;
  onNewCampaign: () => void;
  onRetry?: () => void;
  onAbandonCampaign?: (campaignId: string) => Promise<void>;
  onDeleteCharacter?: (campaignId: string) => Promise<void>;
  className?: string;
};

export function CampaignLobby({
  campaigns,
  error,
  onNewCampaign,
  onRetry,
  onAbandonCampaign,
  onDeleteCharacter,
  className,
}: CampaignLobbyProps) {
  const inProgress = activeCampaigns(campaigns);
  const emptyCampaigns = !error && inProgress.length === 0;
  const [tab, setTab] = useState<LobbyTab>('campaigns');
  const [inspecting, setInspecting] = useState<CampaignListItem | null>(null);
  const [deleting, setDeleting] = useState<CampaignListItem | null>(null);
  const [deleteBusy, setDeleteBusy] = useState(false);

  const handleConfirmDelete = async () => {
    if (!deleting || !onDeleteCharacter) return;
    setDeleteBusy(true);
    try {
      await onDeleteCharacter(deleting.id);
      setInspecting((current) =>
        current?.id === deleting.id ? null : current,
      );
      setDeleting(null);
    } finally {
      setDeleteBusy(false);
    }
  };

  return (
    <div className={cn('relative flex min-h-0 flex-1 flex-col', className)}>
      <div className="shrink-0 border-b border-[var(--panel-edge)] px-4 py-2">
        <SegmentedControl
          options={LOBBY_TABS}
          value={tab}
          onChange={setTab}
          aria-label="Lobby sections"
        />
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

        {emptyCampaigns && tab === 'campaigns' ? (
          <section
            className="play-panel play-panel-glow space-y-3 p-4"
            aria-label="No campaigns"
          >
            <span className="play-lbl">Your playthroughs</span>
            <h2 className="play-h-display text-xl">
              {campaigns.length > 0
                ? 'No active campaigns'
                : 'No campaigns yet'}
            </h2>
            <p className="text-sm text-[var(--ink-3)]">
              {campaigns.length > 0
                ? 'Past heroes stay under Characters. Start a new campaign to play again.'
                : 'Start a campaign to begin play. Your progress saves so you can continue later.'}
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

        {!error && inProgress.length > 0 && tab === 'campaigns' ? (
          <div className="flex flex-col gap-3">
            {inProgress.map((c) => (
              <ActiveCampaignCard
                key={c.id}
                campaign={c}
                onAbandon={onAbandonCampaign}
                onInspectCharacter={() => setInspecting(c)}
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

        {!error && tab === 'characters' ? (
          <CharacterGallery
            campaigns={campaigns}
            onInspect={setInspecting}
            onRequestDelete={onDeleteCharacter ? setDeleting : undefined}
          />
        ) : null}

        <div className="hidden" aria-hidden>
          <div className="play-rune-divider">
            <span>Theme</span>
          </div>

          <ThemePickerRpg variant="play" />
        </div>
      </div>

      {inspecting ? (
        <CharacterDossier
          campaign={inspecting}
          onClose={() => setInspecting(null)}
          onRequestDelete={
            onDeleteCharacter ? () => setDeleting(inspecting) : undefined
          }
          suppressEscape={deleting != null}
        />
      ) : null}

      <DeleteCharacterDialog
        campaign={deleting}
        busy={deleteBusy}
        onCancel={() => {
          if (!deleteBusy) setDeleting(null);
        }}
        onConfirm={() => void handleConfirmDelete()}
      />
    </div>
  );
}
