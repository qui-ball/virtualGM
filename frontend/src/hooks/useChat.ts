import { useCallback, useRef, useState } from 'react';
import { createSession, streamTurn } from '@/api/client';
import { isDev } from '@/config';
import {
  createDevDemoRollPromptEntry,
  DEV_DEMO_PENDING_ACTION,
  DEV_DEMO_ROLL_PROMPT_ID,
} from '@/lib/play/devRollPromptFixture';
import { pendingActionToRollPrompt } from '@/lib/play/pendingActionAdapter';
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
import { rollD20 } from '@/lib/play/roll';
import { toSessionContext } from '@/lib/play/sessionContext';
import type { GameStateSnapshot, PendingAction, TurnRequest } from '@/types';

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

  const appendEntry = useCallback((entry: TranscriptEntry) => {
    setTranscript((prev) => [...prev, entry]);
  }, []);

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
          case 'pending_action': {
            setPendingAction(event.pending_action);
            setGameState(event.game_state);
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
            setGameState(event.game_state);
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
        setGameState(res.game_state);
      }
      const ctx = toSessionContext(res.game_state);
      const now = Date.now();
      const entries: TranscriptEntry[] = [
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

      if (isDev) {
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

        setTranscript((prev) => {
          const marked = markRollPromptRolled(prev, promptId, r.advUsed);
          const result: RollResultFields = {
            id: createEntryId(),
            promptId,
            label: prompt.label,
            stat: prompt.stat,
            nat: r.nat,
            dieA: r.dieA,
            dieB: r.dieB,
            total: r.total,
            modifier: r.modifier,
            advUsed: r.advUsed,
            crit: r.crit,
            fumble: r.fumble,
            pass: r.pass,
            vs: vs ?? undefined,
            dc: prompt.dc,
          };
          return [
            ...marked,
            {
              kind: 'roll_result',
              id: result.id,
              result,
              timestamp: Date.now(),
            },
          ];
        });

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

  return {
    transcript,
    loading,
    rolling,
    pendingAction,
    gameState,
    sessionReady,
    showStubBanner: isDev,
    startSession,
    sendMessage,
    rollPrompt,
    performFreeRoll,
    addRestEntry,
    addItemEntry,
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
