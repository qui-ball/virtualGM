import { describe, expect, it } from 'vitest';
import {
  findActiveRollPrompt,
  formatTranscriptTime,
  markRollPromptRolled,
  parseSceneMarker,
  type TranscriptEntry,
} from '@/lib/play/transcript';
import { chatMessageToTranscriptEntry } from '@/lib/play/transcriptBuild';

describe('parseSceneMarker', () => {
  it('extracts scene text from GM line', () => {
    expect(parseSceneMarker('Scene · Tavern, dusk')).toBe('Scene · Tavern, dusk');
    expect(parseSceneMarker('Hello')).toBeNull();
  });

  it('accepts bullet separator variants', () => {
    expect(parseSceneMarker('Scene • The wagon')).toBe('Scene · The wagon');
  });
});

describe('formatTranscriptTime', () => {
  it('formats timestamps for bubble labels', () => {
    const label = formatTranscriptTime(new Date('2026-05-19T20:04:00').getTime());
    expect(label).toMatch(/\d{1,2}:\d{2}/);
  });
});

describe('chatMessageToTranscriptEntry', () => {
  it('converts scene GM lines to scene entries', () => {
    const entry = chatMessageToTranscriptEntry({
      role: 'gm',
      content: 'Scene · The wagon',
      timestamp: 1,
    });
    expect(entry.kind).toBe('scene');
  });
});

describe('markRollPromptRolled', () => {
  it('marks matching prompt as rolled', () => {
    const entries: TranscriptEntry[] = [
      {
        kind: 'roll_prompt',
        id: 'p1',
        prompt: {
          id: 'p1',
          label: 'Attack',
          modifier: 2,
          advType: 'norm',
          stubEnriched: true,
        },
        rolled: false,
        timestamp: 1,
      },
    ];
    const next = markRollPromptRolled(entries, 'p1', 'adv');
    expect(next[0].kind).toBe('roll_prompt');
    if (next[0].kind === 'roll_prompt') {
      expect(next[0].rolled).toBe(true);
      expect(next[0].advUsed).toBe('adv');
    }
  });
});

describe('findActiveRollPrompt', () => {
  it('returns latest unrolled prompt', () => {
    const entries: TranscriptEntry[] = [
      {
        kind: 'roll_prompt',
        id: 'p1',
        prompt: {
          id: 'p1',
          label: 'A',
          modifier: 0,
          advType: 'norm',
          stubEnriched: true,
        },
        rolled: true,
        timestamp: 1,
      },
      {
        kind: 'roll_prompt',
        id: 'p2',
        prompt: {
          id: 'p2',
          label: 'B',
          modifier: 0,
          advType: 'norm',
          stubEnriched: true,
        },
        rolled: false,
        timestamp: 2,
      },
    ];
    expect(findActiveRollPrompt(entries)?.id).toBe('p2');
  });
});
