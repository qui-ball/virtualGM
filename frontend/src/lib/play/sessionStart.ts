import {
  continueActiveCampaign,
  getSessionMessages,
  getSessionState,
  saveActiveCampaign,
} from '@/api/client';
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
import { recoverLeakedRollPrompts } from '@/lib/play/transcriptRecover';
import type { GameStateSnapshot } from '@/types';

export type PlaySessionStartOptions = {
  campaignId?: string;
  /** Playthrough id from GET /campaigns — prefer continue over create. */
  activeCampaignId?: string;
  /** Live session from start response — prefer over continue when still warm. */
  sessionId?: string;
  characterName?: string;
  soloMode?: boolean;
  recommendedPlayers?: number;
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
    return recoverLeakedRollPrompts(
      hydrateTranscript(
        history.transcript,
        fallbackState?.character ?? null,
      ),
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

/** Resume cached session, warm sessionId, continue a playthrough, or create. */
export async function bootstrapPlaySession(
  options?: PlaySessionStartOptions,
): Promise<PlaySessionBootstrap> {
  const campaignId = options?.campaignId;
  const activeCampaignId = options?.activeCampaignId;
  const warmSessionId = options?.sessionId;
  const cacheKey = activeCampaignId ?? campaignId;
  const cached = getSessionCache(cacheKey);

  async function fromSessionId(
    sessionId: string,
    resumedFromCache: boolean,
  ): Promise<PlaySessionBootstrap | null> {
    try {
      const live = await getSessionState(sessionId);
      const raw = live.game_state ?? cached?.gameState;
      if (!raw) return null;
      const gameState = syncGameStateFlags(raw);
      const transcript = await loadPlayTranscript(sessionId, gameState);
      storeSessionCache(cacheKey, { sessionId, gameState });
      return { sessionId, gameState, transcript, resumedFromCache };
    } catch {
      return null;
    }
  }

  if (cached) {
    const fromCache = await fromSessionId(cached.sessionId, true);
    if (fromCache) return fromCache;
  }

  if (warmSessionId) {
    const fromWarm = await fromSessionId(warmSessionId, false);
    if (fromWarm) return fromWarm;
  }

  if (activeCampaignId) {
    const res = await continueActiveCampaign(activeCampaignId);
    const gameState = res.game_state ? syncGameStateFlags(res.game_state) : null;
    if (gameState) {
      storeSessionCache(cacheKey, {
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

  // No playthrough context — do not invent a legacy session; caller should redirect.
  throw new Error('No active campaign to resume — start from Campaigns');
}

/** Persist playthrough progress while a session is live. */
export async function savePlaythroughProgress(
  activeCampaignId: string,
): Promise<void> {
  await saveActiveCampaign(activeCampaignId);
}

/**
 * Prompt sent (without a player bubble) so the GM narrates the campaign opening
 * when a fresh session has no GM lines yet.
 */
export const CAMPAIGN_OPENING_PROMPT =
  'Begin the campaign. Load the opening campaign section if needed, narrate the opening scene for this character from the campaign materials, then pause and wait for the player\'s first action. Do not invent combat or call for a roll unless the opening scene requires it.';

/** True when the session still needs an opening GM narration. */
export function transcriptNeedsOpening(entries: TranscriptEntry[]): boolean {
  return !entries.some(
    (e) =>
      (e.kind === 'message' && e.role === 'gm') || e.kind === 'roll_prompt',
  );
}
