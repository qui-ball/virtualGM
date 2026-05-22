import { useCallback, useMemo, useRef, useState } from 'react';
import type { CharacterView } from '@/lib/play/characterView';
import { toSessionContext } from '@/lib/play/sessionContext';
import type { TranscriptEntry } from '@/lib/play/transcript';
import { usePullSheet } from '@/hooks/usePullSheet';
import { buildSessionPullMeasure } from '@/lib/play/sessionPullLayout';
import { CharHeader } from '@/components/play/CharHeader';
import { Composer } from '@/components/play/Composer';
import { PlusMenu, type PlusMenuAction } from '@/components/play/PlusMenu';
import { PullHandle } from '@/components/play/PullHandle';
import { RollTray, type FreeRollTrayConfig } from '@/components/play/RollTray';
import { SessionAppBar } from '@/components/play/SessionAppBar';
import { SessionMenu } from '@/components/play/SessionMenu';
import { SheetBody } from '@/components/play/SheetBody';
import { StoryStack } from '@/components/play/StoryStack';
import { VitalStrip } from '@/components/play/VitalStrip';
import type { GameStateSnapshot } from '@/types';
import { cn } from '@/lib/utils';

type SessionLayoutProps = {
  character: CharacterView;
  gameState: GameStateSnapshot | null;
  transcript: TranscriptEntry[];
  loading: boolean;
  rolling: boolean;
  showStubBanner?: boolean;
  onSend: (text: string, options?: { ooc?: boolean }) => void;
  onRollPrompt: (promptId: string) => void;
  onPlusAction: (action: PlusMenuAction) => void;
  onFreeRoll: (config: FreeRollTrayConfig) => void;
  className?: string;
};

export function SessionLayout({
  character,
  gameState,
  transcript,
  loading,
  rolling,
  showStubBanner = false,
  onSend,
  onRollPrompt,
  onPlusAction,
  onFreeRoll,
  className,
}: SessionLayoutProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const appBarRef = useRef<HTMLElement>(null);
  const vitalStripRef = useRef<HTMLDivElement>(null);
  const pullHandleRef = useRef<HTMLButtonElement>(null);
  const composerRef = useRef<HTMLFormElement>(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const [plusOpen, setPlusOpen] = useState(false);
  const [trayOpen, setTrayOpen] = useState(false);
  const [trayConfig, setTrayConfig] = useState<FreeRollTrayConfig | null>(null);
  const [oocMode, setOocMode] = useState(false);

  const sessionContext = useMemo(
    () => toSessionContext(gameState),
    [gameState],
  );

  const measureAnchors = useCallback(
    () =>
      buildSessionPullMeasure({
        appBar: appBarRef.current?.offsetHeight ?? 0,
        vitalStrip: vitalStripRef.current?.offsetHeight ?? 0,
        pullHandle: pullHandleRef.current?.offsetHeight ?? 0,
        composer: composerRef.current?.offsetHeight ?? 0,
      }),
    [],
  );

  const {
    sheetOpen,
    dragging,
    topH,
    botH,
    openness,
    onHandleDown,
    onHandleMove,
    onHandleUp,
    onHandleKeyDown,
  } = usePullSheet(containerRef, { measureAnchors });

  const hideStory = sheetOpen;

  const primaryCastMod =
    character.stats.find((s) => s.key === 'wit')?.mod ??
    character.stats.find((s) => s.key === 'presence')?.mod ??
    0;

  const handlePlusAction = (action: PlusMenuAction) => {
    setPlusOpen(false);
    if (action === 'freeroll') {
      setTrayConfig({
        label: 'Free roll',
        modifier: primaryCastMod,
        vs: null,
      });
      setTrayOpen(true);
      return;
    }
    if (action === 'cast') {
      setTrayConfig({
        label: character.spellsKnown[0] ?? 'Cast spell',
        modifier: primaryCastMod,
        vs: 13,
      });
      setTrayOpen(true);
      return;
    }
    if (action === 'note') {
      setOocMode(true);
      return;
    }
    onPlusAction(action);
  };

  const handleSend = (text: string) => {
    onSend(text, { ooc: oocMode });
    setOocMode(false);
  };

  return (
    <div
      ref={containerRef}
      className={cn('session-root relative min-h-0 flex-1', className)}
    >
      <div className="session-main flex min-h-0 flex-col overflow-hidden">
        <SessionAppBar
          ref={appBarRef}
          context={sessionContext}
          onMenuOpen={() => setMenuOpen(true)}
        />

        <CharHeader character={character} height={topH} dragging={dragging} />

        <VitalStrip
          ref={vitalStripRef}
          character={character}
          className="play-stats-row"
        />

        <SheetBody
          character={character}
          characterState={gameState?.character ?? null}
          height={botH}
          dragging={dragging}
          loading={loading}
          onShortRest={() => onPlusAction('shortrest')}
          onLongRest={() => onPlusAction('longrest')}
        />

        <PullHandle
          ref={pullHandleRef}
          openness={openness}
          sheetOpen={sheetOpen}
          dragging={dragging}
          onPointerDown={onHandleDown}
          onPointerMove={onHandleMove}
          onPointerUp={onHandleUp}
          onKeyDown={onHandleKeyDown}
        />

        <StoryStack
          entries={transcript}
          characterName={character.name}
          loading={loading}
          rolling={rolling}
          showStubBanner={showStubBanner}
          onRollPrompt={onRollPrompt}
          className={cn(
            'min-h-0 flex-1 overflow-hidden',
            hideStory && 'pointer-events-none opacity-0',
          )}
          aria-hidden={hideStory || undefined}
        />
      </div>

      <div className="session-footer relative z-[2] shrink-0">
        <Composer
          ref={composerRef}
          onSend={handleSend}
          plusOpen={plusOpen}
          onPlusToggle={() => setPlusOpen((v) => !v)}
          disabled={loading}
          placeholder={
            oocMode ? 'OOC note (not sent to GM)…' : 'Say or do something…'
          }
        />
      </div>

      <PlusMenu
        open={plusOpen}
        character={character}
        onAction={handlePlusAction}
        onClose={() => setPlusOpen(false)}
      />

      <RollTray
        open={trayOpen}
        config={trayConfig}
        rolling={rolling}
        onRoll={() => {
          if (trayConfig) {
            onFreeRoll(trayConfig);
            setTrayOpen(false);
            setTrayConfig(null);
          }
        }}
        onClose={() => {
          setTrayOpen(false);
          setTrayConfig(null);
        }}
      />

      <SessionMenu open={menuOpen} onClose={() => setMenuOpen(false)} />
    </div>
  );
}
