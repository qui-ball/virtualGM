import { pendingActionToRollPrompt } from '@/lib/play/pendingActionAdapter';
import {
  createEntryId,
  parseSceneMarker,
  type TranscriptEntry,
} from '@/lib/play/transcript';
import type { ChatMessage, CharacterState, PendingAction } from '@/types';

export function chatMessageToTranscriptEntry(
  msg: ChatMessage,
  id: string = createEntryId(),
): TranscriptEntry {
  const scene = msg.role === 'gm' ? parseSceneMarker(msg.content) : null;
  if (scene) {
    return { kind: 'scene', id, text: scene, timestamp: msg.timestamp };
  }
  return {
    kind: 'message',
    id,
    role: msg.role,
    content: msg.content,
    timestamp: msg.timestamp,
    error: msg.role === 'system' && msg.content.startsWith('Error:'),
  };
}

export function rollPromptFromPendingAction(
  action: PendingAction,
  character: CharacterState | null,
  timestamp: number = Date.now(),
): TranscriptEntry {
  const id = createEntryId();
  return {
    kind: 'roll_prompt',
    id,
    prompt: pendingActionToRollPrompt(action, character, id),
    rolled: false,
    timestamp,
  };
}

export function appendLoadingIndicator(
  entries: TranscriptEntry[],
  loading: boolean,
): TranscriptEntry[] {
  const filtered = entries.filter(
    (e) => !(e.kind === 'message' && e.content === '__loading__'),
  );
  if (!loading) {
    return filtered;
  }
  return [
    ...filtered,
    {
      kind: 'message',
      id: '__loading__',
      role: 'system',
      content: '__loading__',
      timestamp: Date.now(),
    },
  ];
}
