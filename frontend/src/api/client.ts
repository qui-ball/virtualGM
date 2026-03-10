/**
 * API client for the Virtual GM backend.
 */

import { apiBaseUrl } from '@/config';
import type {
  CreateSessionResponse,
  GameStateSnapshot,
  PendingAction,
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

export function createSession(): Promise<CreateSessionResponse> {
  return request<CreateSessionResponse>('/sessions', { method: 'POST' });
}

// -- SSE streaming for turns --

export type TurnEvent =
  | { type: 'narration'; text: string }
  | { type: 'thinking'; text: string }
  | {
      type: 'pending_action';
      pending_action: PendingAction;
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

    // Parse complete SSE events from the buffer
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
