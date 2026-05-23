import { useEffect, useMemo } from 'react';
import { PlayShell, SessionLayout } from '@/components/play';
import type { PlusMenuAction } from '@/components/play/PlusMenu';
import type { FreeRollTrayConfig } from '@/components/play/RollTray';
import { useChat } from '@/hooks/useChat';
import { toCharacterView } from '@/lib/play/characterView';

/** Live play session at `/play` (WS-3 layout + WS-5 chat & rolls + WS-7 flows). */
export function SessionPage() {
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
    resolveBossDeath,
    performCast,
    mustResolveLevelUp,
    mustResolveBossDeath,
    sessionBlocked,
    runDebugAction,
    debugStatus,
  } = useChat();

  useEffect(() => {
    startSession();
  }, [startSession]);

  const characterView = useMemo(
    () =>
      gameState?.character ? toCharacterView(gameState.character) : null,
    [gameState],
  );

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
          mustResolveBossDeath={mustResolveBossDeath}
          sessionBlocked={sessionBlocked}
          onSend={(text, opts) => void sendMessage(text, opts)}
          onRollPrompt={(id) => void rollPrompt(id)}
          onPlusAction={handlePlusAction}
          onFreeRoll={handleFreeRoll}
          onConfirmLevelUp={(selection) => void confirmLevelUp(selection)}
          onBossDeath={resolveBossDeath}
          onCast={(cast) => void performCast(cast)}
          onRunDebugAction={runDebugAction}
          debugStatus={debugStatus}
        />
      ) : (
        <div className="flex flex-1 items-center justify-center">
          <p className="text-[var(--ink-3)]">Loading character…</p>
        </div>
      )}
    </PlayShell>
  );
}
