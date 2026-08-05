import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  getSessionState,
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
import {
  appendThinking,
  type DevDebugActionId,
  readDebugThinkingOn,
  writeDebugThinkingOn,
} from '@/lib/play/devDebugConsole';
import {
  createDevDemoRollPromptEntry,
  DEV_DEMO_PENDING_ACTION,
  DEV_DEMO_ROLL_PROMPT_ID,
  isDevDemoPendingAction,
} from '@/lib/play/devRollPromptFixture';
import { parseApiErrorMessage } from '@/lib/play/apiError';
import {
  applyLevelUp,
  levelUpSelectionToRequest,
  shouldBlockForLevelUp,
  type LevelUpSelection,
} from '@/lib/play/levelUp';
import {
  applyNarrationDelta,
  clearStreamingNarrations,
  discardNarration,
  settleNarration,
} from '@/lib/play/narrationStream';
import {
  queueNarrationDelta,
  takePendingNarrationDeltas,
} from '@/lib/play/narrationDeltaBuffer';
import { rollDiceToResultFields } from '@/lib/play/rollResultFields';
import { pendingActionToRollPrompt, rollTargetFromPendingAction } from '@/lib/play/pendingActionAdapter';
import {
  createEntryId,
  markRollPromptRolled,
  type RollResultFields,
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
import { rollResultPayloadToFields } from '@/lib/play/rollResultAdapter';
import { findActiveRollPrompt } from '@/lib/play/transcript';
import { playDiceAnimation } from '@/lib/play/diceAnimation';
import { rollDice } from '@/lib/play/roll';
import { recoverLeakedRollPrompts } from '@/lib/play/transcriptRecover';
import { stripSpuriousSystemErrors } from '@/lib/play/transcriptHydrate';
import {
  bootstrapPlaySession,
  CAMPAIGN_OPENING_PROMPT,
  CAMPAIGN_RESUME_PROMPT,
  savePlaythroughProgress,
  shouldRequestOpeningNarration,
  shouldRequestResumeNarration,
  type PlaySessionStartOptions,
} from '@/lib/play/sessionStart';
import {
  storeSessionCache,
} from '@/lib/play/sessionCache';
import type {
  DiceType,
  GameStateSnapshot,
  PendingAction,
  TurnRequest,
} from '@/types';
import type { CastTrayResult } from '@/lib/play/castFlow';

export type StartSessionOptions = PlaySessionStartOptions;

export function useChat() {
  const [transcript, setTranscript] = useState<TranscriptEntry[]>([]);
  const [loading, setLoading] = useState(false);
  const [rolling, setRolling] = useState(false);
  const [pendingAction, setPendingAction] = useState<PendingAction | null>(null);
  const [gameState, setGameState] = useState<GameStateSnapshot | null>(null);
  const [sessionReady, setSessionReady] = useState(false);
  const [levelUpError, setLevelUpError] = useState<string | null>(null);
  // Dev-only. Thinking never enters the player transcript — it is a developer affordance
  // behind the debug console, off by default.
  const [thinking, setThinking] = useState<string[]>([]);
  const [showThinking, setShowThinking] = useState(readDebugThinkingOn);

  const sessionIdRef = useRef<string | null>(null);
  const campaignIdRef = useRef<string | null>(null);
  const activeCampaignIdRef = useRef<string | null>(null);
  const startingRef = useRef(false);
  const pendingPromptIdRef = useRef<string | null>(null);
  const autoRecoveredRef = useRef(false);

  const appendEntry = useCallback((entry: TranscriptEntry) => {
    if (
      entry.kind === 'message' &&
      entry.role === 'system' &&
      (/savePlaythroughProgress is not defined/i.test(entry.content) ||
        /BodyStreamBuffer was aborted/i.test(entry.content) ||
        /AbortError/i.test(entry.content))
    ) {
      return;
    }
    setTranscript((prev) => [...prev, entry]);
  }, []);

  // Drop a one-off bug bubble if it already landed in the live transcript.
  useEffect(() => {
    if (!sessionReady) return;
    setTranscript((prev) => stripSpuriousSystemErrors(prev));
  }, [sessionReady]);

  const patchGameState = useCallback(
    (patch: (state: GameStateSnapshot) => GameStateSnapshot) => {
      setGameState((prev) => {
        if (!prev) return prev;
        return syncGameStateFlags(patch(prev));
      });
    },
    [],
  );

  const persistSession = useCallback(
    (sessionId: string, state: GameStateSnapshot | null) => {
      if (!state) return;
      const cacheKey =
        activeCampaignIdRef.current ?? campaignIdRef.current;
      storeSessionCache(cacheKey, {
        sessionId,
        gameState: state,
      });
    },
    [],
  );

  // Mid-turn `state_changed` pings → debounced refetch of the authoritative state
  // (ping-to-refetch, single source of truth). Bursts of pings coalesce into one GET.
  const stateRefetchTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const clearStateRefetch = useCallback(() => {
    if (stateRefetchTimer.current) {
      clearTimeout(stateRefetchTimer.current);
      stateRefetchTimer.current = null;
    }
  }, []);

  const refetchGameState = useCallback(async () => {
    const sid = sessionIdRef.current;
    if (!sid) return;
    try {
      const res = await getSessionState(sid);
      if (!res.game_state) return;
      const next = syncGameStateFlags(res.game_state);
      setGameState(next);
      persistSession(sid, next);
    } catch {
      // Transient — the turn's `complete` event (or the next ping) reconciles.
    }
  }, [persistSession]);

  const scheduleStateRefetch = useCallback(() => {
    clearStateRefetch();
    stateRefetchTimer.current = setTimeout(() => {
      stateRefetchTimer.current = null;
      void refetchGameState();
    }, 80);
  }, [clearStateRefetch, refetchGameState]);

  useEffect(() => () => clearStateRefetch(), [clearStateRefetch]);

  const pendingNarrationDeltas = useRef(new Map<string, string>());
  const narrationFlushRaf = useRef<number | null>(null);

  const cancelNarrationFlush = useCallback(() => {
    if (narrationFlushRaf.current != null) {
      cancelAnimationFrame(narrationFlushRaf.current);
      narrationFlushRaf.current = null;
    }
  }, []);

  const flushNarrationDeltas = useCallback(() => {
    cancelNarrationFlush();
    const batch = takePendingNarrationDeltas(pendingNarrationDeltas.current);
    if (batch.size === 0) return;
    setTranscript((prev) => {
      let next = prev;
      for (const [toolCallId, text] of batch) {
        next = applyNarrationDelta(next, toolCallId, text);
      }
      return next;
    });
  }, [cancelNarrationFlush]);

  const scheduleNarrationDelta = useCallback(
    (toolCallId: string, text: string) => {
      // Coalesce same-frame SSE bursts; the typewriter reveal handles pacing.
      queueNarrationDelta(pendingNarrationDeltas.current, toolCallId, text);
      if (narrationFlushRaf.current != null) return;
      narrationFlushRaf.current = requestAnimationFrame(() => {
        narrationFlushRaf.current = null;
        flushNarrationDeltas();
      });
    },
    [flushNarrationDeltas],
  );

  useEffect(() => () => cancelNarrationFlush(), [cancelNarrationFlush]);

  const processTurnStream = useCallback(async (body: TurnRequest) => {
    if (!sessionIdRef.current) return;
    setLoading(true);
    try {
      for await (const event of streamTurn(sessionIdRef.current, body)) {
        switch (event.type) {
          case 'narration_delta':
            scheduleNarrationDelta(event.tool_call_id, event.text);
            break;
          case 'narration': {
            // Flush coalesced deltas in the same commit as settle so UI never
            // briefly shows a stale streaming string after authoritative text.
            cancelNarrationFlush();
            const batch = takePendingNarrationDeltas(
              pendingNarrationDeltas.current,
            );
            setTranscript((prev) => {
              let next = prev;
              for (const [toolCallId, text] of batch) {
                next = applyNarrationDelta(next, toolCallId, text);
              }
              return settleNarration(next, event.tool_call_id, event.text);
            });
            break;
          }
          case 'narration_discard': {
            cancelNarrationFlush();
            pendingNarrationDeltas.current.delete(event.tool_call_id);
            const batch = takePendingNarrationDeltas(
              pendingNarrationDeltas.current,
            );
            setTranscript((prev) => {
              let next = prev;
              for (const [toolCallId, text] of batch) {
                next = applyNarrationDelta(next, toolCallId, text);
              }
              return discardNarration(next, event.tool_call_id, event.retract);
            });
            break;
          }
          case 'thinking':
            // Captured for the dev console only; never appended to the transcript.
            if (isDev) {
              setThinking((prev) => appendThinking(prev, event.text));
            }
            break;
          case 'scene':
            appendEntry({
              kind: 'scene',
              id: createEntryId(),
              text: event.text,
              timestamp: Date.now(),
            });
            break;
          case 'combat_start':
            setGameState(syncGameStateFlags(event.game_state));
            appendEntry({
              kind: 'combat_start',
              id: createEntryId(),
              text: '⚔ Combat begins',
              timestamp: Date.now(),
            });
            break;
          case 'combat_end':
            setGameState(syncGameStateFlags(event.game_state));
            appendEntry({
              kind: 'combat_end',
              id: createEntryId(),
              text: event.reason
                ? `Combat ended · ${event.reason}`
                : 'Combat ended',
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
          case 'state_changed':
            scheduleStateRefetch();
            break;
          case 'pending_action': {
            clearStateRefetch();
            setPendingAction(event.pending_action);
            setGameState(syncGameStateFlags(event.game_state));
            const promptEntry = rollPromptFromPendingAction(
              event.pending_action,
              event.game_state.character,
            );
            pendingPromptIdRef.current = promptEntry.id;
            appendEntry(promptEntry);
            // Unlock UI as soon as the roll prompt arrives — don't wait for the
            // SSE body to close (reload / proxy hang can leave the stream open).
            setLoading(false);
            break;
          }
          case 'complete': {
            clearStateRefetch();
            setPendingAction(null);
            pendingPromptIdRef.current = null;
            const nextState = syncGameStateFlags(event.game_state);
            setGameState(nextState);
            setTranscript((prev) =>
              recoverLeakedRollPrompts(prev, nextState.character),
            );
            if (sessionIdRef.current) {
              persistSession(sessionIdRef.current, nextState);
            }
            setLoading(false);
            const playthroughId = activeCampaignIdRef.current;
            if (playthroughId) {
              void savePlaythroughProgress(playthroughId).catch(() => {
                // Auto-save must never surface as a transcript error.
              });
            }
            break;
          }
          case 'error':
            setTranscript(clearStreamingNarrations);
            appendEntry(
              chatMessageToTranscriptEntry({
                role: 'system',
                content: `Error: ${event.message}`,
                timestamp: Date.now(),
              }),
            );
            // The turn may have mutated state before failing (no snapshot rides on
            // `error`). Reconcile to the server's authoritative state.
            scheduleStateRefetch();
            setLoading(false);
            break;
        }
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      const name = err instanceof Error ? err.name : '';
      // Fetch/stream aborts are transport noise (HMR, tab sleep, old idle timer) —
      // never dump them into the player chat.
      const isAbort =
        name === 'AbortError' ||
        /BodyStreamBuffer was aborted|Turn stream stalled|The operation was aborted/i.test(
          message,
        );
      const isKnownNoise =
        isAbort || /savePlaythroughProgress is not defined/i.test(message);
      if (!isKnownNoise) {
        appendEntry(
          chatMessageToTranscriptEntry({
            role: 'system',
            content: `Error: ${err}`,
            timestamp: Date.now(),
          }),
        );
      }
    } finally {
      // A turn that ends without resolving its narrations — dropped connection, mid-turn
      // crash — must not leave half a sentence standing. Settled bubbles are untouched.
      cancelNarrationFlush();
      pendingNarrationDeltas.current.clear();
      setTranscript(clearStreamingNarrations);
      setLoading(false);
    }
  }, [
    appendEntry,
    persistSession,
    scheduleStateRefetch,
    clearStateRefetch,
    scheduleNarrationDelta,
    cancelNarrationFlush,
  ]);

  const startSession = useCallback(async (options?: StartSessionOptions) => {
    if (startingRef.current || sessionIdRef.current) return;
    startingRef.current = true;
    campaignIdRef.current = options?.campaignId ?? null;
    activeCampaignIdRef.current = options?.activeCampaignId ?? null;
    setLoading(true);
    try {
      const boot = await bootstrapPlaySession(options);
      sessionIdRef.current = boot.sessionId;
      if (boot.gameState) {
        setGameState(boot.gameState);
      }

      const entries = stripSpuriousSystemErrors(boot.transcript);
      setTranscript(entries);
      setSessionReady(true);

      // Fresh playthrough → opening. Mid-campaign continue → brief re-orient.
      // Never restart the prologue just because the live session was recreated.
      if (shouldRequestOpeningNarration(entries, boot.gameState)) {
        await processTurnStream({ message: CAMPAIGN_OPENING_PROMPT });
      } else if (shouldRequestResumeNarration(entries, boot.gameState)) {
        await processTurnStream({ message: CAMPAIGN_RESUME_PROMPT });
      }
    } finally {
      setLoading(false);
    }
  }, [processTurnStream]);

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
        const vs = rollTargetFromPendingAction(pendingAction);
        const r = rollDice({
          diceCount: pendingAction.dice_count,
          diceType: pendingAction.dice_type,
          adv: prompt.advType,
          modifier: prompt.modifier,
          vs,
        });

        setTranscript((prev) => markRollPromptRolled(prev, promptId, r.advUsed));

        const rolls =
          r.diceType === 'd20' && r.advUsed !== 'norm' && r.dieB != null
            ? [r.dieA, r.dieB]
            : r.rolls;

        await playDiceAnimation({ diceType: r.diceType, rolls });

        if (isDevDemoPendingAction(pendingAction)) {
          const result = rollDiceToResultFields(r, promptId, prompt.label, {
            stat: prompt.stat,
            vs: vs ?? undefined,
          });
          setPendingAction(null);
          pendingPromptIdRef.current = null;
          appendEntry({
            kind: 'roll_result',
            id: result.id,
            result,
            timestamp: Date.now(),
          });
          appendEntry(
            chatMessageToTranscriptEntry({
              role: 'system',
              content:
                '[Dev] Roll resolved locally. Send a message to the GM for a real roll prompt from the server.',
              timestamp: Date.now(),
            }),
          );
          return;
        }

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
      diceType?: DiceType;
      diceCount?: number;
    }) => {
      if (loading || rolling) return;
      setRolling(true);
      try {
        const promptId = createEntryId();
        const diceType = opts.diceType ?? 'd20';
        const diceCount = Math.max(1, opts.diceCount ?? 1);
        const r = rollDice({
          diceCount,
          diceType,
          adv: 'norm',
          modifier: opts.modifier,
          vs: opts.vs ?? null,
        });
        const rolls =
          r.diceType === 'd20' && r.advUsed !== 'norm' && r.dieB != null
            ? [r.dieA, r.dieB]
            : r.rolls;
        await playDiceAnimation({ diceType: r.diceType, rolls });
        const result: RollResultFields = {
          id: createEntryId(),
          promptId,
          label: opts.label,
          diceCount: r.diceCount,
          diceType: r.diceType,
          rolls: r.rolls,
          nat: r.nat,
          dieA: r.dieA,
          dieB: r.dieB,
          total: r.total,
          modifier: r.modifier,
          advUsed: r.advUsed,
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
    async (selection: LevelUpSelection): Promise<boolean> => {
      if (!sessionIdRef.current || !gameState?.character) return false;
      setLevelUpError(null);
      try {
        const res = await submitLevelUp(
          sessionIdRef.current,
          levelUpSelectionToRequest(selection),
        );
        setGameState(syncGameStateFlags(res.game_state));
        persistSession(sessionIdRef.current, res.game_state);
        const lv = res.game_state.character?.level ?? '?';
        appendEntry({
          kind: 'message',
          id: createEntryId(),
          role: 'system',
          content: `Level up! Now Lv ${lv}. Choice: ${selection.kind}.`,
          timestamp: Date.now(),
        });
        return true;
      } catch (err) {
        const message = parseApiErrorMessage(err);
        const canApplyLocally =
          isDev &&
          shouldBlockForLevelUp(gameState.character, gameState.in_combat);

        if (canApplyLocally) {
          const updated = applyLevelUp(gameState.character, selection);
          const nextState = syncGameStateFlags({
            ...gameState,
            character: updated,
            in_combat: false,
          });
          setGameState(nextState);
          persistSession(sessionIdRef.current, nextState);
          appendEntry({
            kind: 'message',
            id: createEntryId(),
            role: 'system',
            content: `[Dev] Level up applied locally (Lv ${updated.level}). Server still had ${message} — use a real XP grant from the GM for API level-up.`,
            timestamp: Date.now(),
          });
          return true;
        }

        setLevelUpError(message);
        appendEntry({
          kind: 'message',
          id: createEntryId(),
          role: 'system',
          content: `Level up failed: ${message}`,
          timestamp: Date.now(),
          error: true,
        });
        return false;
      }
    },
    [appendEntry, persistSession, gameState],
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
        persistSession(sessionIdRef.current, res.game_state);
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
    [gameState, appendEntry, persistSession],
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

      if (actionId === 'toggle_thinking') {
        setShowThinking((v) => {
          writeDebugThinkingOn(!v);
          return !v;
        });
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
