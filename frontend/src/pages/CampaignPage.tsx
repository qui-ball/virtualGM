import { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { PlayShell } from '@/components/play';
import { CampaignLobby } from '@/components/play/campaign';
import {
  NewCampaignFlow,
  playParamsFromStart,
} from '@/components/play/campaign/newCampaign/NewCampaignFlow';
import { fetchCampaignList } from '@/lib/play/campaignApi';
import type { CampaignListItem } from '@/lib/play/campaignLobby';
import { PLAY_ROUTES } from '@/lib/play/routes';
import { clearSessionCache, storeSessionCache } from '@/lib/play/sessionCache';
import { abandonActiveCampaign } from '@/api/client';
import { ThemeSelect } from '@/theme';
import { useIsTabletOrUp } from '@/hooks';

/** Campaign lobby (/campaign) — all playthrough instances equally (WS-5). */
export function CampaignPage() {
  const navigate = useNavigate();
  const isTabletOrUp = useIsTabletOrUp();
  const [newCampaignOpen, setNewCampaignOpen] = useState(false);
  const [campaigns, setCampaigns] = useState<CampaignListItem[]>([]);
  const [listError, setListError] = useState<string | null>(null);
  const [loaded, setLoaded] = useState(false);

  const loadCampaigns = useCallback(() => {
    setLoaded(false);
    void fetchCampaignList().then(({ campaigns: list, error }) => {
      setCampaigns(list);
      setListError(error);
      setLoaded(true);
    });
  }, []);

  const abandonCampaign = useCallback(
    async (campaignId: string) => {
      await abandonActiveCampaign(campaignId);
      clearSessionCache(campaignId);
      setCampaigns((prev) => prev.filter((c) => c.id !== campaignId));
    },
    [],
  );

  useEffect(() => {
    loadCampaigns();
  }, [loadCampaigns]);

  return (
    <PlayShell>
      {!isTabletOrUp ? (
        <div className="flex min-h-[44px] shrink-0 items-center justify-end border-b border-[var(--panel-edge)] px-4 py-2">
          <ThemeSelect compact />
        </div>
      ) : null}

      {loaded ? (
        <CampaignLobby
          campaigns={campaigns}
          error={listError}
          onNewCampaign={() => setNewCampaignOpen(true)}
          onRetry={loadCampaigns}
          onAbandonCampaign={abandonCampaign}
        />
      ) : (
        <div className="flex flex-1 items-center justify-center p-6 text-sm text-[var(--ink-3)]">
          Loading campaigns…
        </div>
      )}

      <NewCampaignFlow
        open={newCampaignOpen}
        onClose={() => setNewCampaignOpen(false)}
        onStarted={(result) => {
          setNewCampaignOpen(false);
          storeSessionCache(result.activeCampaignId, {
            sessionId: result.sessionId,
          });
          navigate(
            `${PLAY_ROUTES.session}?${playParamsFromStart(result)}`,
          );
        }}
        onContinueExisting={(activeCampaignId, sessionId) => {
          setNewCampaignOpen(false);
          if (sessionId) {
            storeSessionCache(activeCampaignId, { sessionId });
          }
          const params = new URLSearchParams({
            campaignId: activeCampaignId,
            activeCampaignId,
          });
          if (sessionId) params.set('sessionId', sessionId);
          navigate(`${PLAY_ROUTES.session}?${params.toString()}`);
        }}
      />
    </PlayShell>
  );
}
