import { useCallback, useMemo, useRef, useState, type Dispatch, type SetStateAction } from 'react';
import { isDev } from '@/config';
import {
  readDebugConsoleOpen,
  writeDebugConsoleOpen,
  type DevDebugActionId,
} from '@/lib/play/devDebugConsole';
import { PlayDebugConsole } from '@/components/play/PlayDebugConsole';
import type { CharacterView } from '@/lib/play/characterView';
import { toSessionContext } from '@/lib/play/sessionContext';
import type { TranscriptEntry } from '@/lib/play/transcript';
import type { LevelUpSelection } from '@/lib/play/levelUp';
import type { CastTrayResult } from '@/lib/play/castFlow';
import { usePullSheet } from '@/hooks/usePullSheet';
import { buildSessionMainPullMeasure } from '@/lib/play/sessionPullLayout';
import { BossDeathModal } from '@/components/play/BossDeathModal';
import { CastTray } from '@/components/play/CastTray';
import { CharHeader } from '@/components/play/CharHeader';
import { Composer } from '@/components/play/Composer';
import { ConditionsPopover } from '@/components/play/ConditionsPopover';
import { LevelUpDialog } from '@/components/play/LevelUpDialog';
import { PlusMenu, type PlusMenuAction } from '@/components/play/PlusMenu';
import { PullHandle } from '@/components/play/PullHandle';
import { RollTray, type FreeRollTrayConfig } from '@/components/play/RollTray';
import { SessionAppBar } from '@/components/play/SessionAppBar';
import { SessionMenu } from '@/components/play/SessionMenu';
import { SheetBody } from '@/components/play/SheetBody';
import { StoryStack } from '@/components/play/StoryStack';
import { VitalStrip } from '@/components/play/VitalStrip';
import type { CharacterState, GameStateSnapshot } from '@/types';
import { cn } from '@/lib/utils';

type SessionLayoutProps = {
  character: CharacterView;
  gameState: GameStateSnapshot | null;
  transcript: TranscriptEntry[];
  loading: boolean;
  rolling: boolean;
  showStubBanner?: boolean;
  mustResolveLevelUp: boolean;
  mustResolveBossDeath: boolean;
  sessionBlocked: boolean;
  onSend: (text: string, options?: { ooc?: boolean }) => void;
  onRollPrompt: (promptId: string) => void;
  onPlusAction: (action: PlusMenuAction) => void;
  onFreeRoll: (config: FreeRollTrayConfig) => void;
  onConfirmLevelUp: (selection: LevelUpSelection) => void;
  onBossDeath: (action: 'blaze' | 'risk') => void;
  onCast: (cast: CastTrayResult) => void;
  onRunDebugAction: (id: DevDebugActionId) => void;
  debugStatus?: string;
  className?: string;
};

export function SessionLayout({
  character,
  gameState,
  transcript,
  loading,
  rolling,
  showStubBanner = false,
  mustResolveLevelUp,
  mustResolveBossDeath,
  sessionBlocked,
  onSend,
  onRollPrompt,
  onPlusAction,
  onFreeRoll,
  onConfirmLevelUp,
  onBossDeath,
  onCast,
  onRunDebugAction,
  debugStatus = '',
  className,
}: SessionLayoutProps) {
  const sessionMainRef = useRef<HTMLDivElement>(null);
  const appBarRef = useRef<HTMLElement>(null);
  const vitalStripRef = useRef<HTMLDivElement>(null);
  const pullHandleRef = useRef<HTMLButtonElement>(null);
  const composerRef = useRef<HTMLFormElement>(null);
  const conditionsBtnRef = useRef<HTMLButtonElement>(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const [plusOpen, setPlusOpen] = useState(false);
  const [trayOpen, setTrayOpen] = useState(false);
  const [castOpen, setCastOpen] = useState(false);
  const [trayConfig, setTrayConfig] = useState<FreeRollTrayConfig | null>(null);
  const [conditionsOpen, setConditionsOpen] = useState(false);
  const [oocMode, setOocMode] = useState(false);
  const [debugConsoleOpen, setDebugConsoleOpen] = useState(readDebugConsoleOpen);

  const setDebugOpenPersisted: Dispatch<SetStateAction<boolean>> = useCallback(
    (value) => {
      setDebugConsoleOpen((prev) => {
        const next = typeof value === 'function' ? value(prev) : value;
        writeDebugConsoleOpen(next);
        return next;
      });
    },
    [],
  );

  const sessionContext = useMemo(
    () => toSessionContext(gameState),
    [gameState],
  );

  const measureAnchors = useCallback(
    () =>
      buildSessionMainPullMeasure({
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
  } = usePullSheet(sessionMainRef, { measureAnchors });

  const hideStory = sheetOpen;
  const sheetLocked = sessionBlocked;
  const characterState = gameState?.character ?? null;

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
      setCastOpen(true);
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

  const handleLevelUpConfirm = (selection: LevelUpSelection) => {
    onConfirmLevelUp(selection);
  };

  const handleDebugAction = useCallback(
    (id: DevDebugActionId) => {
      switch (id) {
        case 'open_cast_tray':
          onRunDebugAction('caster_mage');
          setCastOpen(true);
          return;
        case 'open_free_roll':
          onRunDebugAction('exit_combat');
          onRunDebugAction('full_heal');
          setTrayConfig({
            label: 'Free roll',
            modifier: primaryCastMod,
            vs: null,
          });
          setTrayOpen(true);
          return;
        case 'open_conditions':
          onRunDebugAction('demo_conditions');
          setConditionsOpen(true);
          return;
        default:
          onRunDebugAction(id);
      }
    },
    [onRunDebugAction, primaryCastMod],
  );

  return (
    <div className={cn('session-root relative min-h-0 flex-1', className)}>
      <div
        ref={sessionMainRef}
        className={cn(
          'session-main flex min-h-0 flex-col overflow-hidden',
          sessionBlocked && 'pointer-events-none',
        )}
        aria-hidden={sessionBlocked || undefined}
      >
        <SessionAppBar
          ref={appBarRef}
          context={sessionContext}
          bossMode={mustResolveBossDeath}
          onMenuOpen={() => setMenuOpen(true)}
        />

        <CharHeader character={character} height={topH} dragging={dragging} />

        <VitalStrip
          ref={vitalStripRef}
          character={character}
          className="play-stats-row"
          conditionsButtonRef={conditionsBtnRef}
          conditionsOpen={conditionsOpen}
          onConditionsClick={() => setConditionsOpen((v) => !v)}
        />

        <div id="play-character-sheet" className="min-h-0 flex flex-col">
          <SheetBody
            character={character}
            characterState={characterState}
            height={sheetLocked ? 0 : botH}
            dragging={dragging}
            loading={loading}
            onShortRest={() => onPlusAction('shortrest')}
            onLongRest={() => onPlusAction('longrest')}
          />
        </div>

        <PullHandle
          ref={pullHandleRef}
          openness={openness}
          sheetOpen={sheetOpen && !sheetLocked}
          dragging={dragging}
          disabled={sheetLocked}
          onPointerDown={sheetLocked ? undefined : onHandleDown}
          onPointerMove={sheetLocked ? undefined : onHandleMove}
          onPointerUp={sheetLocked ? undefined : onHandleUp}
          onKeyDown={sheetLocked ? undefined : onHandleKeyDown}
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
            (hideStory || sessionBlocked) && 'pointer-events-none opacity-0',
          )}
          aria-hidden={hideStory || sessionBlocked || undefined}
        />
      </div>

      <div
        className={cn(
          'session-footer relative z-[2] shrink-0',
          sessionBlocked && 'pointer-events-none opacity-40',
        )}
        aria-hidden={sessionBlocked || undefined}
      >
        <Composer
          ref={composerRef}
          onSend={handleSend}
          plusOpen={plusOpen}
          onPlusToggle={() => setPlusOpen((v) => !v)}
          disabled={loading || sessionBlocked}
          placeholder={
            oocMode ? 'OOC note (not sent to GM)…' : 'Say or do something…'
          }
        />
      </div>

      <PlusMenu
        open={plusOpen && !sessionBlocked}
        character={character}
        onAction={handlePlusAction}
        onClose={() => setPlusOpen(false)}
      />

      <RollTray
        open={trayOpen && !sessionBlocked}
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

      <CastTray
        open={castOpen && !sessionBlocked}
        character={character}
        characterState={
          characterState ?? {
            name: character.name,
            character_class: character.classLabel.toLowerCase(),
            level: character.level,
            xp: character.xp,
            stats: {
              might: character.stats.find((s) => s.key === 'might')?.mod ?? 0,
              finesse:
                character.stats.find((s) => s.key === 'finesse')?.mod ?? 0,
              wit: character.stats.find((s) => s.key === 'wit')?.mod ?? 0,
              presence:
                character.stats.find((s) => s.key === 'presence')?.mod ?? 0,
            },
            hp: character.hp,
            hp_max: character.hpMax,
            evasion: character.evasion,
            mana: character.mana,
            mana_max: character.manaMax,
            conditions: character.conditions.map((c) => c.id),
            class_abilities: character.classAbilities,
            spells_known: character.spellsKnown,
            gold: character.gold,
            inventory: character.inventory,
            equipped_weapon: null,
            equipped_armor: null,
          }
        }
        onCast={(cast) => {
          onCast(cast);
          setCastOpen(false);
        }}
        onClose={() => setCastOpen(false)}
      />

      <ConditionsPopover
        open={conditionsOpen && !sessionBlocked}
        anchorRef={conditionsBtnRef}
        active={character.conditions.map((c) => c.id)}
        onClose={() => setConditionsOpen(false)}
      />

      <SessionMenu
        open={menuOpen && !sessionBlocked}
        onClose={() => setMenuOpen(false)}
        debugConsoleOpen={debugConsoleOpen}
        onDebugConsoleToggle={() =>
          setDebugOpenPersisted((v) => !v)
        }
      />

      {isDev ? (
        <PlayDebugConsole
          open={debugConsoleOpen}
          onClose={() => setDebugOpenPersisted(false)}
          onAction={handleDebugAction}
          status={debugStatus}
        />
      ) : null}

      {mustResolveLevelUp && characterState ? (
        <LevelUpDialog
          open
          character={character}
          characterState={characterState}
          onConfirm={handleLevelUpConfirm}
        />
      ) : null}

      {mustResolveBossDeath ? (
        <BossDeathModal
          open
          characterName={character.name}
          onBlazeOfGlory={() => onBossDeath('blaze')}
          onRiskItAll={() => onBossDeath('risk')}
        />
      ) : null}
    </div>
  );
}
