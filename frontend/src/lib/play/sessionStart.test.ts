import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  continueActiveCampaign,
  getSessionMessages,
  getSessionState,
} from '@/api/client';
import {
  bootstrapPlaySession,
  loadPlayTranscript,
  transcriptNeedsOpening,
} from '@/lib/play/sessionStart';
import {
  clearSessionCache,
  getSessionCache,
  storeSessionCache,
} from '@/lib/play/sessionCache';
import type { GameStateSnapshot } from '@/types';

vi.mock('@/api/client', () => ({
  continueActiveCampaign: vi.fn(),
  getSessionMessages: vi.fn(),
  getSessionState: vi.fn(),
  saveActiveCampaign: vi.fn(),
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
      storeSessionCache('fantasy-lost-mine', {
        sessionId: 'cached-sess',
        gameState: GAME_STATE,
      });
      vi.mocked(getSessionState).mockResolvedValue({
        game_state: GAME_STATE,
      });
      vi.mocked(getSessionMessages).mockResolvedValue({
        messages: [],
        transcript: [],
      });

      const result = await bootstrapPlaySession({
        campaignId: 'fantasy-lost-mine',
      });

      expect(result.resumedFromCache).toBe(true);
      expect(result.sessionId).toBe('cached-sess');
      expect(continueActiveCampaign).not.toHaveBeenCalled();
    });

    it('uses warm sessionId from start without calling continue', async () => {
      vi.mocked(getSessionState).mockResolvedValue({
        game_state: GAME_STATE,
      });
      vi.mocked(getSessionMessages).mockResolvedValue({
        messages: [],
        transcript: [],
      });

      const result = await bootstrapPlaySession({
        activeCampaignId: 'ac-1',
        sessionId: 'warm-sess',
      });

      expect(result.sessionId).toBe('warm-sess');
      expect(getSessionState).toHaveBeenCalledWith('warm-sess');
      expect(continueActiveCampaign).not.toHaveBeenCalled();
      expect(getSessionCache('ac-1')?.sessionId).toBe('warm-sess');
    });

    it('continues playthrough when cache and warm session fail', async () => {
      storeSessionCache('ac-1', {
        sessionId: 'stale-sess',
        gameState: GAME_STATE,
      });
      vi.mocked(getSessionState).mockRejectedValue(new Error('404'));
      vi.mocked(continueActiveCampaign).mockResolvedValue({
        active_campaign_id: 'ac-1',
        character_id: 'ch-1',
        session_id: 'continued-sess',
        character_name: 'Aldric of Corlinn Hill',
        campaign_template_slug: 'fantasy-lost-mine',
        game_state: GAME_STATE,
      });
      vi.mocked(getSessionMessages).mockResolvedValue({
        messages: [],
        transcript: [],
      });

      const result = await bootstrapPlaySession({
        activeCampaignId: 'ac-1',
        sessionId: 'also-stale',
      });

      expect(result.sessionId).toBe('continued-sess');
      expect(continueActiveCampaign).toHaveBeenCalledWith('ac-1');
    });

    it('throws when no playthrough context', async () => {
      await expect(bootstrapPlaySession({})).rejects.toThrow(
        /start from Campaigns/i,
      );
    });

    it('restores combat strip state from live session on cache resume', async () => {
      const combatState: GameStateSnapshot = {
        ...GAME_STATE,
        in_combat: true,
        initiative_order: ['Aldric of Corlinn Hill', 'Goblin 1'],
        current_turn_index: 1,
        enemies: {
          g1: {
            name: 'Goblin 1',
            hp: 2,
            hp_max: 5,
            evasion: 12,
            attack_modifier: 0,
            damage: '1d6',
            conditions: [],
          },
        },
      };
      storeSessionCache('fantasy-lost-mine', {
        sessionId: 'cached-sess',
        gameState: { ...GAME_STATE, in_combat: false },
      });
      vi.mocked(getSessionState).mockResolvedValue({
        game_state: combatState,
      });
      vi.mocked(getSessionMessages).mockResolvedValue({
        messages: [],
        transcript: [],
      });

      const result = await bootstrapPlaySession({
        campaignId: 'fantasy-lost-mine',
      });

      expect(result.gameState?.in_combat).toBe(true);
      expect(result.gameState?.initiative_order).toEqual([
        'Aldric of Corlinn Hill',
        'Goblin 1',
      ]);
      clearSessionCache('fantasy-lost-mine');
    });
  });
});

describe('transcriptNeedsOpening', () => {
  it('is true for seeded scene/system-only transcripts', () => {
    expect(
      transcriptNeedsOpening([
        {
          kind: 'scene',
          id: '1',
          text: 'Scene · Road to Phandalin',
          timestamp: 1,
        },
        {
          kind: 'message',
          id: '2',
          role: 'system',
          content: 'Session started. You are Aldric.',
          timestamp: 2,
        },
      ]),
    ).toBe(true);
  });

  it('is false once a GM message or roll prompt exists', () => {
    expect(
      transcriptNeedsOpening([
        {
          kind: 'message',
          id: '1',
          role: 'gm',
          content: 'The road winds east…',
          timestamp: 1,
        },
      ]),
    ).toBe(false);
    expect(
      transcriptNeedsOpening([
        {
          kind: 'roll_prompt',
          id: '1',
          prompt: {
            id: '1',
            label: 'Attack',
            diceCount: 1,
            diceType: 'd20',
            modifier: 0,
            advType: 'norm',
          },
          rolled: false,
          timestamp: 1,
        },
      ]),
    ).toBe(false);
  });
});
