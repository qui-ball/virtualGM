import { useCallback, useRef, useState } from 'react';
import { createSession, streamTurn } from '@/api/client';
import type {
  ChatMessage,
  GameStateSnapshot,
  PendingAction,
  TurnRequest,
} from '@/types';

const DICE_SIDES: Record<string, number> = {
  d4: 4, d6: 6, d8: 8, d10: 10, d12: 12, d20: 20, d100: 100,
};

export function useChat(campaignId: string | null) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [loading, setLoading] = useState(false);
  const [pendingAction, setPendingAction] = useState<PendingAction | null>(null);
  const [gameState, setGameState] = useState<GameStateSnapshot | null>(null);
  const [sessionReady, setSessionReady] = useState(false);

  const sessionIdRef = useRef<string | null>(null);
  const sessionCampaignIdRef = useRef<string | null>(null);
  const startingRef = useRef(false);

  const processTurnStream = useCallback(async (body: TurnRequest) => {
    if (!sessionIdRef.current) return;
    setLoading(true);
    try {
      for await (const event of streamTurn(sessionIdRef.current, body)) {
        switch (event.type) {
          case 'narration':
            setMessages((prev) => [
              ...prev,
              { role: 'gm', content: event.text, timestamp: Date.now() },
            ]);
            break;
          case 'pending_action':
            setPendingAction(event.pending_action);
            setGameState(event.game_state);
            break;
          case 'complete':
            setPendingAction(null);
            setGameState(event.game_state);
            break;
          case 'error':
            setMessages((prev) => [
              ...prev,
              { role: 'system', content: `Error: ${event.message}`, timestamp: Date.now() },
            ]);
            break;
        }
      }
    } catch (err) {
      setMessages((prev) => [
        ...prev,
        { role: 'system', content: `Error: ${err}`, timestamp: Date.now() },
      ]);
    } finally {
      setLoading(false);
    }
  }, []);

  const startSession = useCallback(async () => {
    if (!campaignId) return;
    if (
      startingRef.current ||
      (sessionIdRef.current && sessionCampaignIdRef.current === campaignId)
    ) {
      return;
    }

    if (sessionCampaignIdRef.current !== campaignId) {
      sessionIdRef.current = null;
      sessionCampaignIdRef.current = null;
      setMessages([]);
      setPendingAction(null);
      setGameState(null);
      setSessionReady(false);
    }

    startingRef.current = true;
    setLoading(true);
    try {
      const res = await createSession({ active_campaign_id: campaignId });
      sessionIdRef.current = res.session_id;
      sessionCampaignIdRef.current = res.active_campaign_id ?? campaignId;
      setMessages([
        {
          role: 'system',
          content: res.campaign_name
            ? `Session started in ${res.campaign_name}. You are ${res.character_name}.`
            : `Session started. You are ${res.character_name}.`,
          timestamp: Date.now(),
        },
      ]);
      setSessionReady(true);
    } finally {
      setLoading(false);
      startingRef.current = false;
    }
  }, [campaignId]);

  const sendMessage = useCallback(
    async (text: string) => {
      if (!sessionIdRef.current || loading) return;
      setMessages((prev) => [
        ...prev,
        { role: 'player', content: text, timestamp: Date.now() },
      ]);
      await processTurnStream({ message: text });
    },
    [loading, processTurnStream],
  );

  const respondToAction = useCallback(
    async (rollResult: number, individualRolls?: number[]) => {
      if (!sessionIdRef.current || !pendingAction || loading) return;
      setMessages((prev) => [
        ...prev,
        {
          role: 'player',
          content: `Rolled ${rollResult} for ${pendingAction.purpose}`,
          timestamp: Date.now(),
        },
      ]);
      setPendingAction(null);
      await processTurnStream({
        action_response: {
          roll_result: rollResult,
          individual_rolls: individualRolls,
        },
      });
    },
    [loading, pendingAction, processTurnStream],
  );

  const autoRoll = useCallback(() => {
    if (!pendingAction) return;
    const sides = DICE_SIDES[pendingAction.dice_type] ?? 20;
    const rolls: number[] = [];
    for (let i = 0; i < pendingAction.dice_count; i++) {
      rolls.push(Math.floor(Math.random() * sides) + 1);
    }
    const total = rolls.reduce((a, b) => a + b, 0);
    respondToAction(total, rolls);
  }, [pendingAction, respondToAction]);

  return {
    messages,
    loading,
    pendingAction,
    gameState,
    sessionReady,
    startSession,
    sendMessage,
    respondToAction,
    autoRoll,
  };
}
