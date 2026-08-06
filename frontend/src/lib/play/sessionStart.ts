import {
  continueActiveCampaign,
  getSessionMessages,
  getSessionState,
  saveActiveCampaign,
} from '@/api/client';
import { syncGameStateFlags } from '@/lib/play/devDebugActions';
import {
  clearSessionCache,
  getSessionCache,
  storeSessionCache,
} from '@/lib/play/sessionCache';
import { toSessionContext } from '@/lib/play/sessionContext';
import {
  chatMessageToTranscriptEntry,
} from '@/lib/play/transcriptBuild';
import { createEntryId, type TranscriptEntry } from '@/lib/play/transcript';
import { hydrateTranscript, stripSpuriousSystemErrors } from '@/lib/play/transcriptHydrate';
import { recoverLeakedRollPrompts } from '@/lib/play/transcriptRecover';
import type { GameStateSnapshot, TranscriptArchive } from '@/types';

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

/** Collapsible summary blocks prepended above recent raw entries. */
export function archiveSummariesToEntries(
  archive: TranscriptArchive | null | undefined,
): TranscriptEntry[] {
  const summaries = archive?.summaries ?? [];
  if (!summaries.length) return [];
  return [...summaries]
    .sort(
      (a, b) =>
        (a.segment_index ?? 0) - (b.segment_index ?? 0),
    )
    .map((s, i) => ({
      kind: 'summary' as const,
      id: `summary-${s.segment_index ?? i + 1}`,
      text: String(s.summary_text || '').trim() || 'Earlier events.',
      segmentIndex: Number(s.segment_index ?? i + 1),
      timestamp: i,
    }));
}

/** Prefer archive raw entries when present; otherwise load from session messages. */
export async function loadPlayTranscript(
  sessionId: string,
  fallbackState: GameStateSnapshot | null,
  archive?: TranscriptArchive | null,
): Promise<TranscriptEntry[]> {
  const summaryEntries = archiveSummariesToEntries(archive);

  if (archive?.entries?.length) {
    const hydrated = stripSpuriousSystemErrors(
      recoverLeakedRollPrompts(
        hydrateTranscript(
          archive.entries,
          fallbackState?.character ?? null,
        ),
      ),
    );
    return [...summaryEntries, ...hydrated];
  }

  try {
    const history = await getSessionMessages(sessionId);
    const hydrated = stripSpuriousSystemErrors(
      recoverLeakedRollPrompts(
        hydrateTranscript(
          history.transcript,
          fallbackState?.character ?? null,
        ),
      ),
    );
    return [...summaryEntries, ...hydrated];
  } catch {
    const ctx = toSessionContext(fallbackState);
    const now = Date.now();
    return [
      ...summaryEntries,
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
    // Dead session id after backend restart — drop so we don't keep probing it.
    clearSessionCache(cacheKey);
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
      res.transcript_archive,
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
  try {
    await saveActiveCampaign(activeCampaignId);
  } catch (err) {
    // After a backend restart there is no live session until /continue; the
    // durable playthrough already holds the last successful snapshot.
    const message = err instanceof Error ? err.message : String(err);
    if (/call \/continue first|No live session/i.test(message)) {
      return;
    }
    throw err;
  }
}

/**
 * Prompt sent (without a player bubble) so the GM narrates the campaign opening
 * when a fresh session has no GM lines yet.
 */
export const CAMPAIGN_OPENING_PROMPT =
  'Begin the campaign. Load the opening campaign section if needed, narrate the opening scene for this character from the campaign materials, then pause and wait for the player\'s first action. Do not invent combat or call for a roll unless the opening scene requires it.';

/**
 * Mid-campaign resume after backend restart / continue recreate — re-orient only.
 * Must never restart the prologue.
 */
export const CAMPAIGN_RESUME_PROMPT =
  'The player is resuming a mid-campaign playthrough. Using the live game state (scene, chapter, countdowns, character progress), briefly re-orient them in the current moment with one narrate(). Do NOT restart the campaign opening or prologue. Then pause and wait for their action.';

/** True when the session still needs an opening GM narration. */
export function transcriptNeedsOpening(entries: TranscriptEntry[]): boolean {
  return !entries.some(
    (e) =>
      (e.kind === 'message' && e.role === 'gm') || e.kind === 'roll_prompt',
  );
}

/** Durable progress that means this is not a brand-new playthrough. */
export function playthroughHasProgress(
  state: GameStateSnapshot | null | undefined,
): boolean {
  if (!state) return false;
  if ((state.character?.xp ?? 0) > 0) return true;
  if ((state.chapter ?? 1) > 1) return true;
  if ((state.time_current ?? 0) > 0) return true;
  return false;
}

/** Fresh playthrough with empty GM transcript → request opening narration. */
export function shouldRequestOpeningNarration(
  entries: TranscriptEntry[],
  gameState: GameStateSnapshot | null | undefined,
): boolean {
  return transcriptNeedsOpening(entries) && !playthroughHasProgress(gameState);
}

/** Continued mid-campaign seed transcript → request brief re-orient, not opening. */
export function shouldRequestResumeNarration(
  entries: TranscriptEntry[],
  gameState: GameStateSnapshot | null | undefined,
): boolean {
  return transcriptNeedsOpening(entries) && playthroughHasProgress(gameState);
}
