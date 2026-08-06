import { useEffect, useMemo, useRef } from 'react';
import { Navigate, useSearchParams } from 'react-router-dom';
import { PlayShell, SessionLayout } from '@/components/play';
import type { PlusMenuAction } from '@/components/play/PlusMenu';
import type { FreeRollTrayConfig } from '@/components/play/RollTray';
import { useChat } from '@/hooks/useChat';
import {
  parseRecommendedPlayersParam,
  parseSoloModeParam,
} from '@/lib/play/campaignMeta';
import { toCharacterView } from '@/lib/play/characterView';
import { PLAY_ROUTES } from '@/lib/play/routes';
import { savePlaythroughProgress } from '@/lib/play/sessionStart';

/** Live play session at `/play` — requires activeCampaignId from lobby/start. */
export function SessionPage() {
  const [searchParams] = useSearchParams();
  const campaignId = searchParams.get('campaignId') ?? undefined;
  const activeCampaignId = searchParams.get('activeCampaignId') ?? undefined;
  const sessionId = searchParams.get('sessionId') ?? undefined;
  const characterName = searchParams.get('characterName') ?? undefined;
  const soloMode = parseSoloModeParam(searchParams.get('soloMode'));
  const recommendedPlayers = parseRecommendedPlayersParam(
    searchParams.get('recommendedPlayers'),
  );

  const {
    transcript,
    loading,
    rolling,
    gameState,
    sessionReady,
    showStubBanner,
    startSession,
    sendMessage,
    rollPrompt,
    performFreeRoll,
    submitPlayerAction,
    confirmLevelUp,
    completeNarrationReveal,
    levelUpError,
    resolveBossDeath,
    performCast,
    mustResolveLevelUp,
    mustResolveBossDeath,
    sessionBlocked,
    runDebugAction,
    debugStatus,
    thinking,
    showThinking,
  } = useChat();

  const activeCampaignIdRef = useRef(activeCampaignId);
  activeCampaignIdRef.current = activeCampaignId;

  useEffect(() => {
    if (!activeCampaignId) return;
    void startSession({
      campaignId,
      activeCampaignId,
      sessionId,
      characterName,
      soloMode,
      recommendedPlayers,
    });
  }, [
    startSession,
    campaignId,
    activeCampaignId,
    sessionId,
    characterName,
    soloMode,
    recommendedPlayers,
  ]);

  useEffect(() => {
    if (!activeCampaignId) return;

    const save = () => {
      const id = activeCampaignIdRef.current;
      if (id) void savePlaythroughProgress(id);
    };

    const onHide = () => {
      if (document.visibilityState === 'hidden') save();
    };

    window.addEventListener('pagehide', save);
    document.addEventListener('visibilitychange', onHide);
    return () => {
      window.removeEventListener('pagehide', save);
      document.removeEventListener('visibilitychange', onHide);
      save();
    };
  }, [activeCampaignId]);

  const characterView = useMemo(
    () =>
      gameState?.character ? toCharacterView(gameState.character) : null,
    [gameState],
  );

  if (!activeCampaignId) {
    return <Navigate to={PLAY_ROUTES.campaign} replace />;
  }

  const handlePlusAction = (action: PlusMenuAction) => {
    switch (action) {
      case 'shortrest':
        void submitPlayerAction({ rest_type: 'short' });
        break;
      case 'longrest':
        void submitPlayerAction({ rest_type: 'long' });
        break;
      case 'item':
        void submitPlayerAction({ use_item: 'Healing draught' });
        break;
      case 'note':
        break;
      default:
        break;
    }
  };

  const handleFreeRoll = (config: FreeRollTrayConfig) => {
    void performFreeRoll(config);
  };

  return (
    <PlayShell>
      {!sessionReady ? (
        <div className="flex flex-1 items-center justify-center">
          <p className="text-[var(--ink-3)]">Starting session…</p>
        </div>
      ) : characterView ? (
        <SessionLayout
          character={characterView}
          gameState={gameState}
          transcript={transcript}
          loading={loading}
          rolling={rolling}
          showStubBanner={showStubBanner}
          mustResolveLevelUp={mustResolveLevelUp}
          levelUpError={levelUpError}
          mustResolveBossDeath={mustResolveBossDeath}
          sessionBlocked={sessionBlocked}
          onSend={(text, opts) => void sendMessage(text, opts)}
          onRollPrompt={(id) => void rollPrompt(id)}
          onPlusAction={handlePlusAction}
          onFreeRoll={handleFreeRoll}
          onConfirmLevelUp={(selection) => confirmLevelUp(selection)}
          onBossDeath={resolveBossDeath}
          onCast={(cast) => void performCast(cast)}
          onNarrationRevealComplete={completeNarrationReveal}
          onRunDebugAction={runDebugAction}
          debugStatus={debugStatus}
          thinking={thinking}
          showThinking={showThinking}
        />
      ) : (
        <div className="flex flex-1 items-center justify-center">
          <p className="text-[var(--ink-3)]">Loading character…</p>
        </div>
      )}
    </PlayShell>
  );
}
