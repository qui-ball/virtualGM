import { describe, expect, it } from 'vitest';
import {
  appendLoadingIndicator,
  chatMessageToTranscriptEntry,
  rollPromptFromPendingAction,
} from '@/lib/play/transcriptBuild';
import type { TranscriptEntry } from '@/lib/play/transcript';
import type { CharacterState, PendingAction } from '@/types';

const WARRIOR: CharacterState = {
  name: 'Aldric',
  character_class: 'warrior',
  level: 1,
  xp: 0,
  stats: { might: 2, finesse: 1, wit: 0, presence: -1 },
  hp: 12,
  hp_max: 12,
  evasion: 14,
  mana: null,
  mana_max: null,
  conditions: [],
  class_abilities: [],
  spells_known: [],
  gold: 10,
  inventory: [],
  equipped_weapon: null,
  equipped_armor: null,
};

describe('chatMessageToTranscriptEntry (WS-5 messages)', () => {
  it('maps GM lines to message entries', () => {
    const entry = chatMessageToTranscriptEntry({
      role: 'gm',
      content: 'The door creaks open.',
      timestamp: 100,
    });
    expect(entry).toMatchObject({
      kind: 'message',
      role: 'gm',
      content: 'The door creaks open.',
    });
  });

  it('maps player lines to message entries', () => {
    const entry = chatMessageToTranscriptEntry({
      role: 'player',
      content: 'I search the room.',
      timestamp: 200,
    });
    expect(entry).toMatchObject({
      kind: 'message',
      role: 'player',
      content: 'I search the room.',
    });
  });

  it('flags system errors for error styling', () => {
    const entry = chatMessageToTranscriptEntry({
      role: 'system',
      content: 'Error: connection lost',
      timestamp: 300,
    });
    expect(entry.kind).toBe('message');
    if (entry.kind === 'message') {
      expect(entry.error).toBe(true);
    }
  });

  it('does not flag non-error system lines', () => {
    const entry = chatMessageToTranscriptEntry({
      role: 'system',
      content: 'Session resumed.',
      timestamp: 301,
    });
    if (entry.kind === 'message') {
      expect(entry.error).toBeFalsy();
    }
  });
});

describe('rollPromptFromPendingAction (WS-5 rolls)', () => {
  it('builds roll_prompt entries from pending actions', () => {
    const action: PendingAction = {
      action_type: 'attack',
      dice_count: 1,
      dice_type: 'd20',
      purpose: 'Longsword strike',
      tool_call_id: 't1',
      stat: 'might',
      modifier: 2,
      dc: 13,
    };
    const entry = rollPromptFromPendingAction(action, WARRIOR, 500);
    expect(entry.kind).toBe('roll_prompt');
    if (entry.kind === 'roll_prompt') {
      expect(entry.rolled).toBe(false);
      expect(entry.timestamp).toBe(500);
      expect(entry.prompt.label).toBe('Longsword strike');
      expect(entry.prompt.stat).toBe('Mig');
      expect(entry.prompt.stubEnriched).toBe(false);
    }
  });
});

describe('appendLoadingIndicator (WS-5 loading)', () => {
  const base: TranscriptEntry[] = [
    {
      kind: 'message',
      id: 'm1',
      role: 'gm',
      content: 'Hello',
      timestamp: 1,
    },
  ];

  it('appends a single loading placeholder when loading', () => {
    const next = appendLoadingIndicator(base, true);
    expect(next).toHaveLength(2);
    expect(next[1]).toMatchObject({
      kind: 'message',
      role: 'system',
      content: '__loading__',
    });
  });

  it('removes loading placeholder when not loading', () => {
    const withLoading = appendLoadingIndicator(base, true);
    const cleared = appendLoadingIndicator(withLoading, false);
    expect(cleared).toEqual(base);
  });

  it('replaces duplicate loading markers', () => {
    const doubled = appendLoadingIndicator(
      appendLoadingIndicator(base, true),
      true,
    );
    expect(
      doubled.filter(
        (e) => e.kind === 'message' && e.content === '__loading__',
      ),
    ).toHaveLength(1);
  });
});
