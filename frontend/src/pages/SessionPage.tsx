import { useEffect, useMemo } from 'react';
import { PlayShell, SessionLayout } from '@/components/play';
import type { PlusMenuAction } from '@/components/play/PlusMenu';
import type { FreeRollTrayConfig } from '@/components/play/RollTray';
import { useChat } from '@/hooks/useChat';
import { toCharacterView } from '@/lib/play/characterView';

/** Live play session at `/play` (WS-3 layout + WS-5 chat & rolls). */
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
    addRestEntry,
    addItemEntry,
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
        addRestEntry('Short rest · +HP · time −1');
        break;
      case 'longrest':
        addRestEntry('Long rest · HP & MP full · time −5');
        break;
      case 'item':
        addItemEntry('Item used · see inventory in sheet');
        break;
      case 'note':
        break; // handled in SessionLayout (OOC composer mode)
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
          onSend={(text, opts) => void sendMessage(text, opts)}
          onRollPrompt={(id) => void rollPrompt(id)}
          onPlusAction={handlePlusAction}
          onFreeRoll={handleFreeRoll}
        />
      ) : (
        <div className="flex flex-1 items-center justify-center">
          <p className="text-[var(--ink-3)]">Loading character…</p>
        </div>
      )}
    </PlayShell>
  );
}
