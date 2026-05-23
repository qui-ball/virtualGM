import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  createSession,
  getSessionMessages,
  streamTurn,
  submitBossDeath,
  submitLevelUp,
} from '@/api/client';
import { isDev } from '@/config';
import {
  applyDebugGamePatch,
  debugActionNeedsUnblock,
  debugUnblockForPanels,
  syncGameStateFlags,
} from '@/lib/play/devDebugActions';
import { type DevDebugActionId } from '@/lib/play/devDebugConsole';
import {
  createDevDemoRollPromptEntry,
  DEV_DEMO_PENDING_ACTION,
  DEV_DEMO_ROLL_PROMPT_ID,
} from '@/lib/play/devRollPromptFixture';
import { pendingActionToRollPrompt } from '@/lib/play/pendingActionAdapter';
import {
  createEntryId,
  markRollPromptRolled,
  type TranscriptEntry,
} from '@/lib/play/transcript';
import {
  chatMessageToTranscriptEntry,
  rollPromptFromPendingAction,
} from '@/lib/play/transcriptBuild';
import {
  applyNonBossAutoRecover,
  blazeOfGloryCopy,
  isBossZeroState,
  riskItAllCopy,
  rollRiskItAll,
  shouldNonBossAutoRecover,
} from '@/lib/play/bossDeath';
import {
  levelUpSelectionToRequest,
  shouldBlockForLevelUp,
  type LevelUpSelection,
} from '@/lib/play/levelUp';
import { rollResultPayloadToFields } from '@/lib/play/rollResultAdapter';
import { hydrateTranscript } from '@/lib/play/transcriptHydrate';
import { findActiveRollPrompt } from '@/lib/play/transcript';
import { rollD20 } from '@/lib/play/roll';
import { toSessionContext } from '@/lib/play/sessionContext';
import type {
  GameStateSnapshot,
  PendingAction,
  TurnRequest,
} from '@/types';
import type { CastTrayResult } from '@/lib/play/castFlow';

export function useChat() {
  const [transcript, setTranscript] = useState<TranscriptEntry[]>([]);
  const [loading, setLoading] = useState(false);
  const [rolling, setRolling] = useState(false);
  const [pendingAction, setPendingAction] = useState<PendingAction | null>(null);
  const [gameState, setGameState] = useState<GameStateSnapshot | null>(null);
  const [sessionReady, setSessionReady] = useState(false);

  const sessionIdRef = useRef<string | null>(null);
  const startingRef = useRef(false);
  const pendingPromptIdRef = useRef<string | null>(null);
  const autoRecoveredRef = useRef(false);

  const appendEntry = useCallback((entry: TranscriptEntry) => {
    setTranscript((prev) => [...prev, entry]);
  }, []);

  const patchGameState = useCallback(
    (patch: (state: GameStateSnapshot) => GameStateSnapshot) => {
      setGameState((prev) => {
        if (!prev) return prev;
        return syncGameStateFlags(patch(prev));
      });
    },
    [],
  );

  const processTurnStream = useCallback(async (body: TurnRequest) => {
    if (!sessionIdRef.current) return;
    setLoading(true);
    try {
      for await (const event of streamTurn(sessionIdRef.current, body)) {
        switch (event.type) {
          case 'narration':
            appendEntry(
              chatMessageToTranscriptEntry({
                role: 'gm',
                content: event.text,
                timestamp: Date.now(),
              }),
            );
            break;
          case 'scene':
            appendEntry({
              kind: 'scene',
              id: createEntryId(),
              text: event.text,
              timestamp: Date.now(),
            });
            break;
          case 'roll_result': {
            const fields = rollResultPayloadToFields(
              event.roll_result,
              pendingPromptIdRef.current ?? undefined,
            );
            setTranscript((prev) => {
              const promptId = pendingPromptIdRef.current;
              const marked =
                promptId != null
                  ? markRollPromptRolled(prev, promptId, event.roll_result.adv_used)
                  : prev;
              return [
                ...marked,
                {
                  kind: 'roll_result',
                  id: createEntryId(),
                  result: fields,
                  timestamp: Date.now(),
                },
              ];
            });
            break;
          }
          case 'pending_action': {
            setPendingAction(event.pending_action);
            setGameState(syncGameStateFlags(event.game_state));
            const promptEntry = rollPromptFromPendingAction(
              event.pending_action,
              event.game_state.character,
            );
            pendingPromptIdRef.current = promptEntry.id;
            appendEntry(promptEntry);
            break;
          }
          case 'complete':
            setPendingAction(null);
            pendingPromptIdRef.current = null;
            setGameState(syncGameStateFlags(event.game_state));
            break;
          case 'error':
            appendEntry(
              chatMessageToTranscriptEntry({
                role: 'system',
                content: `Error: ${event.message}`,
                timestamp: Date.now(),
              }),
            );
            break;
        }
      }
    } catch (err) {
      appendEntry(
        chatMessageToTranscriptEntry({
          role: 'system',
          content: `Error: ${err}`,
          timestamp: Date.now(),
        }),
      );
    } finally {
      setLoading(false);
    }
  }, [appendEntry]);

  const startSession = useCallback(async () => {
    if (startingRef.current || sessionIdRef.current) return;
    startingRef.current = true;
    setLoading(true);
    try {
      const res = await createSession();
      sessionIdRef.current = res.session_id;
      if (res.game_state) {
        setGameState(syncGameStateFlags(res.game_state));
      }

      let entries: TranscriptEntry[] = [];
      try {
        const history = await getSessionMessages(res.session_id);
        entries = hydrateTranscript(
          history.transcript,
          res.game_state?.character ?? null,
        );
      } catch {
        const ctx = toSessionContext(res.game_state);
        const now = Date.now();
        entries = [
          {
            kind: 'scene',
            id: createEntryId(),
            text: `Scene · ${ctx.scene}`,
            timestamp: now,
          },
          chatMessageToTranscriptEntry({
            role: 'system',
            content: `Session started. You are ${res.character_name}.`,
            timestamp: now,
          }),
        ];
      }

      if (isDev) {
        const now = Date.now();
        entries.push(
          chatMessageToTranscriptEntry({
            role: 'gm',
            content:
              'A goblin snarls and raises its shield. [Dev fixture] Use the roll card below to test the UI.',
            timestamp: now + 1,
          }),
          createDevDemoRollPromptEntry(res.game_state?.character ?? null, now + 2),
        );
        setPendingAction(DEV_DEMO_PENDING_ACTION);
        pendingPromptIdRef.current = DEV_DEMO_ROLL_PROMPT_ID;
      }

      setTranscript(entries);
      setSessionReady(true);
    } finally {
      setLoading(false);
    }
  }, []);

  const sendMessage = useCallback(
    async (text: string, options?: { ooc?: boolean }) => {
      if (!sessionIdRef.current || loading) return;
      const display = options?.ooc ? `(OOC: ${text})` : text;
      appendEntry({
        kind: 'message',
        id: createEntryId(),
        role: 'player',
        content: display,
        timestamp: Date.now(),
        ooc: options?.ooc,
      });
      if (options?.ooc) return;
      await processTurnStream({ message: text });
    },
    [loading, processTurnStream, appendEntry],
  );

  const submitRollResult = useCallback(
    async (total: number, individualRolls?: number[]) => {
      if (!sessionIdRef.current || !pendingAction || loading) return;
      setPendingAction(null);
      pendingPromptIdRef.current = null;
      await processTurnStream({
        action_response: {
          roll_result: total,
          individual_rolls: individualRolls,
        },
      });
    },
    [loading, pendingAction, processTurnStream],
  );

  const rollPrompt = useCallback(
    async (promptId: string) => {
      if (!sessionIdRef.current || !pendingAction || loading || rolling) return;
      if (pendingPromptIdRef.current !== promptId) return;

      const prompt = pendingActionToRollPrompt(
        pendingAction,
        gameState?.character ?? null,
        promptId,
      );
      setRolling(true);
      try {
        const vs = prompt.vs ?? prompt.dc ?? null;
        const r = rollD20({
          adv: prompt.advType,
          modifier: prompt.modifier,
          vs,
        });

        setTranscript((prev) => markRollPromptRolled(prev, promptId, r.advUsed));

        const rolls =
          r.advUsed !== 'norm' && r.dieB != null
            ? [r.dieA, r.dieB]
            : [r.nat];
        await submitRollResult(r.total, rolls);
      } finally {
        setRolling(false);
      }
    },
    [pendingAction, gameState, loading, rolling, submitRollResult],
  );

  const performFreeRoll = useCallback(
    async (opts: {
      label: string;
      modifier: number;
      vs?: number | null;
    }) => {
      if (loading || rolling) return;
      setRolling(true);
      try {
        const promptId = createEntryId();
        const r = rollD20({ adv: 'norm', modifier: opts.modifier, vs: opts.vs ?? null });
        const result: RollResultFields = {
          id: createEntryId(),
          promptId,
          label: opts.label,
          nat: r.nat,
          dieA: r.dieA,
          total: r.total,
          modifier: r.modifier,
          advUsed: 'norm',
          crit: r.crit,
          fumble: r.fumble,
          pass: r.pass,
          vs: opts.vs ?? undefined,
          freeRoll: true,
        };
        appendEntry({
          kind: 'roll_result',
          id: result.id,
          result,
          timestamp: Date.now(),
        });
      } finally {
        setRolling(false);
      }
    },
    [loading, rolling, appendEntry],
  );

  const addRestEntry = useCallback((text: string) => {
    appendEntry({
      kind: 'rest',
      id: createEntryId(),
      text,
      timestamp: Date.now(),
    });
  }, [appendEntry]);

  const addItemEntry = useCallback((text: string) => {
    appendEntry({
      kind: 'item',
      id: createEntryId(),
      text,
      timestamp: Date.now(),
    });
  }, [appendEntry]);

  const confirmLevelUp = useCallback(
    async (selection: LevelUpSelection) => {
      if (!sessionIdRef.current) return;
      try {
        const res = await submitLevelUp(
          sessionIdRef.current,
          levelUpSelectionToRequest(selection),
        );
        setGameState(res.game_state);
        const lv = res.game_state.character?.level ?? '?';
        appendEntry({
          kind: 'message',
          id: createEntryId(),
          role: 'system',
          content: `Level up! Now Lv ${lv}. Choice: ${selection.kind}.`,
          timestamp: Date.now(),
        });
      } catch (err) {
        appendEntry({
          kind: 'message',
          id: createEntryId(),
          role: 'system',
          content: `Level up failed: ${err}`,
          timestamp: Date.now(),
          error: true,
        });
      }
    },
    [appendEntry],
  );

  const resolveBossDeath = useCallback(
    async (action: 'blaze' | 'risk') => {
      if (!sessionIdRef.current || !gameState?.character) return;
      const name = gameState.character.name;
      const preview =
        action === 'blaze' ? blazeOfGloryCopy(name) : riskItAllCopy(rollRiskItAll());

      try {
        const res = await submitBossDeath(sessionIdRef.current, {
          choice: action,
        });
        setGameState(res.game_state);
        appendEntry({
          kind: 'message',
          id: createEntryId(),
          role: 'system',
          content: preview,
          timestamp: Date.now(),
        });
      } catch (err) {
        appendEntry({
          kind: 'message',
          id: createEntryId(),
          role: 'system',
          content: `Boss death resolution failed: ${err}`,
          timestamp: Date.now(),
          error: true,
        });
      }
    },
    [gameState, appendEntry],
  );

  const performCast = useCallback(
    async (cast: CastTrayResult) => {
      if (!sessionIdRef.current || !gameState?.character || loading || rolling) {
        return;
      }
      const mana = gameState.character.mana ?? 0;
      if (mana < cast.cost) return;

      setRolling(true);
      try {
        await processTurnStream({
          cast_spell: {
            spell_id: cast.spellId,
            tier: cast.tier,
            mp_cost: cast.cost,
          },
        });
      } finally {
        setRolling(false);
      }
    },
    [gameState, loading, rolling, processTurnStream],
  );

  const submitPlayerAction = useCallback(
    async (body: TurnRequest) => {
      if (!sessionIdRef.current || loading) return;
      if (body.rest_type === 'short') {
        addRestEntry('Short rest · +HP · time −1');
      } else if (body.rest_type === 'long') {
        addRestEntry('Long rest · HP & MP full · time −5');
      } else if (body.use_item) {
        addItemEntry(`Item used · ${body.use_item}`);
      }
      await processTurnStream(body);
    },
    [loading, processTurnStream, addRestEntry, addItemEntry],
  );

  useEffect(() => {
    if (!shouldNonBossAutoRecover(gameState) || !gameState?.character) {
      autoRecoveredRef.current = false;
      return;
    }
    if (autoRecoveredRef.current) return;
    autoRecoveredRef.current = true;
    const recovered = applyNonBossAutoRecover(gameState.character);
    patchGameState((gs) => ({
      ...gs,
      character: recovered,
      in_combat: false,
    }));
    appendEntry({
      kind: 'message',
      id: createEntryId(),
      role: 'system',
      content:
        'You collapse but rally — full HP and MP restored (non-boss encounter). Loot loss TBD.',
      timestamp: Date.now(),
    });
  }, [
    gameState?.character?.hp,
    gameState?.in_combat,
    gameState?.boss_encounter,
    gameState,
    patchGameState,
    appendEntry,
  ]);

  const mustResolveLevelUp =
    gameState?.character != null &&
    shouldBlockForLevelUp(gameState.character, gameState.in_combat);

  const mustResolveBossDeath = isBossZeroState(gameState);

  const sessionBlocked = mustResolveLevelUp || mustResolveBossDeath;

  const runDebugAction = useCallback(
    (actionId: DevDebugActionId) => {
      if (!isDev) return;

      if (actionId === 'roll_prompt') {
        patchGameState((gs) => {
          if (!gs.character) return gs;
          let next = debugUnblockForPanels(gs);
          autoRecoveredRef.current = true;
          return next;
        });
        appendEntry(createDevDemoRollPromptEntry(gameState?.character ?? null));
        setPendingAction(DEV_DEMO_PENDING_ACTION);
        pendingPromptIdRef.current = DEV_DEMO_ROLL_PROMPT_ID;
        return;
      }

      if (actionId === 'scene_marker') {
        appendEntry({
          kind: 'scene',
          id: createEntryId(),
          text: 'Scene · Debug crossroads',
          timestamp: Date.now(),
        });
        return;
      }

      if (actionId === 'short_rest_log') {
        void submitPlayerAction({ rest_type: 'short' });
        return;
      }

      if (actionId === 'long_rest_log') {
        void submitPlayerAction({ rest_type: 'long' });
        return;
      }

      if (actionId === 'item_log') {
        void submitPlayerAction({ use_item: 'Healing draught' });
        return;
      }

      patchGameState((gs) => {
        if (!gs.character) return gs;

        if (actionId === 'non_boss_zero') {
          autoRecoveredRef.current = false;
        }
        if (actionId === 'boss_zero') {
          autoRecoveredRef.current = true;
        }

        let next = debugActionNeedsUnblock(actionId)
          ? debugUnblockForPanels(gs)
          : gs;
        const patched = applyDebugGamePatch(next, actionId);
        return patched ?? next;
      });
    },
    [
      gameState?.character,
      patchGameState,
      appendEntry,
      submitPlayerAction,
    ],
  );

  const debugStatus = gameState?.character
    ? `Lv ${gameState.character.level} · XP ${gameState.character.xp} · HP ${gameState.character.hp}/${gameState.character.hp_max} · combat ${gameState.in_combat ? 'on' : 'off'} · boss ${gameState.boss_encounter ? 'on' : 'off'} · lvl↑ ${gameState.pending_level_up ? 'yes' : 'no'}`
    : 'No character';

  const showStubBanner = useMemo(() => {
    if (!isDev) return false;
    const active = findActiveRollPrompt(transcript);
    return active?.prompt.stubEnriched ?? false;
  }, [transcript]);

  return {
    transcript,
    loading,
    rolling,
    pendingAction,
    gameState,
    sessionReady,
    showStubBanner,
    submitPlayerAction,
    startSession,
    sendMessage,
    rollPrompt,
    performFreeRoll,
    addRestEntry,
    addItemEntry,
    confirmLevelUp,
    resolveBossDeath,
    performCast,
    mustResolveLevelUp,
    mustResolveBossDeath,
    sessionBlocked,
    runDebugAction,
    debugStatus,
    patchGameState,
    /** @deprecated Use rollPrompt from in-chat card */
    respondToAction: submitRollResult,
    /** @deprecated Use rollPrompt from in-chat card */
    autoRoll: () => {
      const id = pendingPromptIdRef.current;
      if (id) void rollPrompt(id);
    },
    pendingActionToRollPrompt,
  };
}
