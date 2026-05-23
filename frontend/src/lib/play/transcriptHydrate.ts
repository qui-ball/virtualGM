import { pendingActionToRollPrompt } from '@/lib/play/pendingActionAdapter';
import { rollResultPayloadToFields } from '@/lib/play/rollResultAdapter';
import {
  createEntryId,
  type TranscriptEntry,
} from '@/lib/play/transcript';
import type {
  CharacterState,
  TranscriptEntryDto,
} from '@/types';

/** Rebuild client transcript from API transcript rows (G10). */
export function hydrateTranscript(
  rows: TranscriptEntryDto[],
  character: CharacterState | null,
): TranscriptEntry[] {
  const out: TranscriptEntry[] = [];

  for (const row of rows) {
    const ts = Math.round(row.timestamp * 1000);
    switch (row.kind) {
      case 'scene':
        if (row.text) {
          out.push({ kind: 'scene', id: row.id, text: row.text, timestamp: ts });
        }
        break;
      case 'message':
        if (row.content && row.role) {
          out.push({
            kind: 'message',
            id: row.id,
            role: row.role as 'gm' | 'player' | 'system',
            content: row.content,
            timestamp: ts,
            error:
              row.role === 'system' && row.content.startsWith('Error:'),
          });
        }
        break;
      case 'roll_prompt':
        if (row.pending_action) {
          const id = row.id || createEntryId();
          out.push({
            kind: 'roll_prompt',
            id,
            prompt: pendingActionToRollPrompt(
              row.pending_action,
              character,
              id,
            ),
            rolled: false,
            timestamp: ts,
          });
        }
        break;
      case 'roll_result':
        if (row.roll_result) {
          const fields = rollResultPayloadToFields(row.roll_result);
          out.push({
            kind: 'roll_result',
            id: row.id,
            result: fields,
            timestamp: ts,
          });
        }
        break;
      case 'rest':
        if (row.text) {
          out.push({ kind: 'rest', id: row.id, text: row.text, timestamp: ts });
        }
        break;
      case 'item':
        if (row.text) {
          out.push({ kind: 'item', id: row.id, text: row.text, timestamp: ts });
        }
        break;
      default:
        break;
    }
  }

  return out;
}
