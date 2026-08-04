/**
 * API client for the Virtual GM backend.
 */

import { apiBaseUrl } from '@/config';
import type {
  BossDeathRequest,
  CampaignListResponse,
  CampaignTemplateSummary,
  CreateSessionRequest,
  CreateSessionResponse,
  GameStateSnapshot,
  HealthResponse,
  LevelUpRequest,
  MessagesResponse,
  PackageSummary,
  PendingAction,
  PrebuiltCharacterSummary,
  RollResultPayload,
  StartCampaignRequest,
  StartCampaignResponse,
  TurnRequest,
} from '@/types';

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${apiBaseUrl}${path}`, {
    headers: { 'Content-Type': 'application/json' },
    ...init,
  });
  if (!res.ok) {
    const body = await res.text();
    throw new Error(`API ${res.status}: ${body}`);
  }
  return res.json() as Promise<T>;
}

export function getHealth(): Promise<HealthResponse> {
  return request<HealthResponse>('/health');
}

export function createSession(
  body?: CreateSessionRequest,
): Promise<CreateSessionResponse> {
  return request<CreateSessionResponse>('/sessions', {
    method: 'POST',
    body: body ? JSON.stringify(body) : undefined,
  });
}

export function getCampaigns(): Promise<CampaignListResponse> {
  return request<CampaignListResponse>('/campaigns');
}

export function getCampaignTemplates(): Promise<{
  templates: CampaignTemplateSummary[];
}> {
  return request('/campaign-templates');
}

export function getPrebuiltCharacters(slug: string): Promise<{
  prebuilts: PrebuiltCharacterSummary[];
}> {
  return request(
    `/campaign-templates/${encodeURIComponent(slug)}/prebuilt-characters`,
  );
}

export function getStartingPackages(
  slug: string,
  classId?: string,
): Promise<{ packages: PackageSummary[] }> {
  const q = classId ? `?class_id=${encodeURIComponent(classId)}` : '';
  return request(
    `/campaign-templates/${encodeURIComponent(slug)}/starting-packages${q}`,
  );
}

export function getRaces(): Promise<{ races: { id: string; name: string }[] }> {
  return request('/races');
}

export function startActiveCampaign(
  body: StartCampaignRequest,
): Promise<StartCampaignResponse> {
  return request<StartCampaignResponse>('/active-campaigns', {
    method: 'POST',
    body: JSON.stringify(body),
  });
}

export function continueActiveCampaign(
  activeCampaignId: string,
): Promise<StartCampaignResponse> {
  return request<StartCampaignResponse>(
    `/active-campaigns/${encodeURIComponent(activeCampaignId)}/continue`,
    { method: 'POST' },
  );
}

export function saveActiveCampaign(activeCampaignId: string): Promise<{
  active_campaign_id: string;
  session_id: string;
  chapter: number;
  time_current: number;
  last_scene: string;
}> {
  return request(
    `/active-campaigns/${encodeURIComponent(activeCampaignId)}/save`,
    { method: 'POST' },
  );
}

/** Permanently remove a playthrough from the lobby. */
export function abandonActiveCampaign(
  activeCampaignId: string,
): Promise<{ ok: boolean; active_campaign_id: string }> {
  return request(
    `/active-campaigns/${encodeURIComponent(activeCampaignId)}`,
    { method: 'DELETE' },
  );
}

export function getSessionMessages(
  sessionId: string,
): Promise<MessagesResponse> {
  return request<MessagesResponse>(`/sessions/${sessionId}/messages`);
}

/** Authoritative current game state — single source of truth (resume + ping-refetch). */
export function getSessionState(
  sessionId: string,
): Promise<{ game_state: GameStateSnapshot }> {
  return request(`/sessions/${sessionId}/state`);
}

export function submitLevelUp(
  sessionId: string,
  body: LevelUpRequest,
): Promise<{ game_state: GameStateSnapshot }> {
  return request(`/sessions/${sessionId}/level-up`, {
    method: 'POST',
    body: JSON.stringify(body),
  });
}

export function submitBossDeath(
  sessionId: string,
  body: BossDeathRequest,
): Promise<{ game_state: GameStateSnapshot }> {
  return request(`/sessions/${sessionId}/boss-death`, {
    method: 'POST',
    body: JSON.stringify(body),
  });
}

// -- SSE streaming for turns --

export type TurnEvent =
  // Cumulative player-safe narration read off narrate()'s in-flight arguments. Provisional
  // until the matching `narration` (settle) or `narration_discard` arrives.
  | { type: 'narration_delta'; tool_call_id: string; text: string }
  | { type: 'narration'; text: string; tool_call_id?: string }
  // `retract` is set when a whole attempt is being regenerated, and means the entry must go
  // even if it already settled. A plain discard only removes still-streaming text.
  | { type: 'narration_discard'; tool_call_id: string; retract?: boolean }
  | { type: 'thinking'; text: string }
  | { type: 'scene'; text: string }
  | { type: 'state_changed'; fields: string[] }
  | {
      type: 'pending_action';
      pending_action: PendingAction;
      game_state: GameStateSnapshot;
    }
  | {
      type: 'roll_result';
      roll_result: RollResultPayload;
    }
  | {
      type: 'combat_start';
      initiative_order: string[];
      game_state: GameStateSnapshot;
    }
  | {
      type: 'combat_end';
      reason?: string;
      game_state: GameStateSnapshot;
    }
  | {
      type: 'complete';
      game_state: GameStateSnapshot;
      internal_notes: string | null;
    }
  | { type: 'error'; message: string };

export async function* streamTurn(
  sessionId: string,
  body: TurnRequest,
): AsyncGenerator<TurnEvent> {
  const res = await fetch(`${apiBaseUrl}/sessions/${sessionId}/turns`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`API ${res.status}: ${text}`);
  }

  const reader = res.body!.getReader();
  const decoder = new TextDecoder();
  let buffer = '';

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    buffer += decoder.decode(value, { stream: true });

    while (true) {
      const eventEnd = buffer.indexOf('\n\n');
      if (eventEnd === -1) break;

      const eventBlock = buffer.slice(0, eventEnd);
      buffer = buffer.slice(eventEnd + 2);

      let eventType = 'message';
      let data = '';

      for (const line of eventBlock.split('\n')) {
        if (line.startsWith('event: ')) {
          eventType = line.slice(7);
        } else if (line.startsWith('data: ')) {
          data = line.slice(6);
        }
      }

      if (data) {
        const parsed = JSON.parse(data);
        yield { type: eventType, ...parsed } as TurnEvent;
      }
    }
  }
}
