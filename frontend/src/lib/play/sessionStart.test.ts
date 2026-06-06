import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createSession, getSessionMessages } from '@/api/client';
import {
  bootstrapPlaySession,
  loadPlayTranscript,
} from '@/lib/play/sessionStart';
import {
  clearSessionCache,
  getSessionCache,
  storeSessionCache,
} from '@/lib/play/sessionCache';
import type { GameStateSnapshot } from '@/types';

vi.mock('@/api/client', () => ({
  createSession: vi.fn(),
  getSessionMessages: vi.fn(),
}));

function createSessionStorageMock(): Storage {
  const store = new Map<string, string>();
  return {
    get length() {
      return store.size;
    },
    clear: () => store.clear(),
    getItem: (key: string) => store.get(key) ?? null,
    key: (index: number) => [...store.keys()][index] ?? null,
    removeItem: (key: string) => {
      store.delete(key);
    },
    setItem: (key: string, value: string) => {
      store.set(key, value);
    },
  };
}

const GAME_STATE: GameStateSnapshot = {
  character: {
    name: 'Aldric of Corlinn Hill',
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
  },
  enemies: {},
  countdowns: {},
  in_combat: false,
  campaign_title: 'Lost Mine',
};

describe('sessionStart', () => {
  beforeEach(() => {
    vi.stubGlobal('sessionStorage', createSessionStorageMock());
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  describe('loadPlayTranscript', () => {
    it('hydrates transcript rows from API', async () => {
      vi.mocked(getSessionMessages).mockResolvedValue({
        messages: [],
        transcript: [
          {
            kind: 'message',
            id: 'm1',
            timestamp: 1,
            role: 'gm',
            content: 'Hello',
          },
        ],
      });

      const entries = await loadPlayTranscript('sess1', GAME_STATE);
      expect(entries).toHaveLength(1);
      expect(entries[0]?.kind).toBe('message');
      if (entries[0]?.kind === 'message') {
        expect(entries[0].content).toBe('Hello');
      }
    });

    it('falls back to scene + resume system line when messages fail', async () => {
      vi.mocked(getSessionMessages).mockRejectedValue(new Error('404'));

      const entries = await loadPlayTranscript('sess1', GAME_STATE);
      expect(entries).toHaveLength(2);
      expect(entries[0]?.kind).toBe('scene');
      expect(entries[1]?.kind).toBe('message');
      if (entries[1]?.kind === 'message') {
        expect(entries[1].content).toContain('Aldric of Corlinn Hill');
      }
    });
  });

  describe('bootstrapPlaySession', () => {
    it('resumes from session cache when messages succeed', async () => {
      storeSessionCache('lost-mine', {
        sessionId: 'cached-sess',
        gameState: GAME_STATE,
      });
      vi.mocked(getSessionMessages).mockResolvedValue({
        messages: [],
        transcript: [],
      });

      const result = await bootstrapPlaySession({ campaignId: 'lost-mine' });

      expect(result.resumedFromCache).toBe(true);
      expect(result.sessionId).toBe('cached-sess');
      expect(result.gameState?.character?.name).toBe('Aldric of Corlinn Hill');
      expect(createSession).not.toHaveBeenCalled();
    });

    it('creates a new session when cache is stale', async () => {
      storeSessionCache('lost-mine', {
        sessionId: 'stale-sess',
        gameState: GAME_STATE,
      });
      vi.mocked(getSessionMessages)
        .mockRejectedValueOnce(new Error('404'))
        .mockResolvedValueOnce({ messages: [], transcript: [] });
      vi.mocked(createSession).mockResolvedValue({
        session_id: 'new-sess',
        character_name: 'Aldric of Corlinn Hill',
        game_state: GAME_STATE,
      });

      const result = await bootstrapPlaySession({ campaignId: 'lost-mine' });

      expect(result.resumedFromCache).toBe(false);
      expect(result.sessionId).toBe('new-sess');
      expect(createSession).toHaveBeenCalledWith(undefined);
      expect(getSessionCache('lost-mine')?.sessionId).toBe('new-sess');
    });

    it('creates session with character_name when provided', async () => {
      vi.mocked(createSession).mockResolvedValue({
        session_id: 'new-sess',
        character_name: 'Zaelan',
        game_state: GAME_STATE,
      });
      vi.mocked(getSessionMessages).mockResolvedValue({
        messages: [],
        transcript: [],
      });

      await bootstrapPlaySession({ characterName: 'Zaelan' });

      expect(createSession).toHaveBeenCalledWith({ character_name: 'Zaelan' });
    });

    it('stores cache on new session per campaign bucket', async () => {
      vi.mocked(createSession).mockResolvedValue({
        session_id: 'camp-b-sess',
        character_name: 'Wren',
        game_state: GAME_STATE,
      });
      vi.mocked(getSessionMessages).mockResolvedValue({
        messages: [],
        transcript: [],
      });

      await bootstrapPlaySession({ campaignId: 'ribcage-coast' });

      expect(getSessionCache('ribcage-coast')?.sessionId).toBe('camp-b-sess');
      clearSessionCache('ribcage-coast');
      expect(getSessionCache('lost-mine')).toBeNull();
    });
  });
});
