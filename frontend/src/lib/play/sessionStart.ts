import { createSession, getSessionMessages } from '@/api/client';
import { syncGameStateFlags } from '@/lib/play/devDebugActions';
import {
  getSessionCache,
  storeSessionCache,
} from '@/lib/play/sessionCache';
import { toSessionContext } from '@/lib/play/sessionContext';
import {
  chatMessageToTranscriptEntry,
} from '@/lib/play/transcriptBuild';
import { createEntryId, type TranscriptEntry } from '@/lib/play/transcript';
import { hydrateTranscript } from '@/lib/play/transcriptHydrate';
import type { GameStateSnapshot } from '@/types';

export type PlaySessionStartOptions = {
  campaignId?: string;
  characterName?: string;
};

export type PlaySessionBootstrap = {
  sessionId: string;
  gameState: GameStateSnapshot | null;
  transcript: TranscriptEntry[];
  resumedFromCache: boolean;
};

/** Rebuild transcript from API or minimal fallback when messages fail. */
export async function loadPlayTranscript(
  sessionId: string,
  fallbackState: GameStateSnapshot | null,
): Promise<TranscriptEntry[]> {
  try {
    const history = await getSessionMessages(sessionId);
    return hydrateTranscript(
      history.transcript,
      fallbackState?.character ?? null,
    );
  } catch {
    const ctx = toSessionContext(fallbackState);
    const now = Date.now();
    return [
      {
        kind: 'scene',
        id: createEntryId(),
        text: `Scene · ${ctx.scene}`,
        timestamp: now,
      },
      chatMessageToTranscriptEntry({
        role: 'system',
        content: fallbackState?.character
          ? `Session resumed. You are ${fallbackState.character.name}.`
          : 'Session resumed.',
        timestamp: now,
      }),
    ];
  }
}

/** Resume cached session or create a new one; persists cache on create. */
export async function bootstrapPlaySession(
  options?: PlaySessionStartOptions,
): Promise<PlaySessionBootstrap> {
  const campaignId = options?.campaignId;
  const cached = getSessionCache(campaignId);

  if (cached) {
    try {
      await getSessionMessages(cached.sessionId);
      const transcript = await loadPlayTranscript(
        cached.sessionId,
        cached.gameState,
      );
      return {
        sessionId: cached.sessionId,
        gameState: syncGameStateFlags(cached.gameState),
        transcript,
        resumedFromCache: true,
      };
    } catch {
      // Cached session expired on server — fall through to create.
    }
  }

  const res = await createSession(
    options?.characterName
      ? { character_name: options.characterName }
      : undefined,
  );
  const gameState = res.game_state ? syncGameStateFlags(res.game_state) : null;
  if (gameState) {
    storeSessionCache(campaignId, {
      sessionId: res.session_id,
      gameState,
    });
  }
  const transcript = await loadPlayTranscript(
    res.session_id,
    res.game_state ?? null,
  );

  return {
    sessionId: res.session_id,
    gameState,
    transcript,
    resumedFromCache: false,
  };
}
