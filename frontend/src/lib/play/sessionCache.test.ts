import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  clearSessionCache,
  getSessionCache,
  sessionCacheKey,
  storeSessionCache,
} from '@/lib/play/sessionCache';

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

describe('sessionCache', () => {
  beforeEach(() => {
    vi.stubGlobal('sessionStorage', createSessionStorageMock());
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('uses default bucket when campaign id is absent', () => {
    expect(sessionCacheKey()).toBe('_default');
    expect(sessionCacheKey('')).toBe('_default');
  });

  it('stores and retrieves session by campaign id', () => {
    storeSessionCache('lost-mine', {
      sessionId: 'abc123',
      gameState: { character: null, enemies: {}, countdowns: {}, in_combat: false },
    });

    const entry = getSessionCache('lost-mine');
    expect(entry?.sessionId).toBe('abc123');
    expect(entry?.gameState.in_combat).toBe(false);
  });

  it('clears a campaign bucket', () => {
    storeSessionCache('lost-mine', {
      sessionId: 'abc123',
      gameState: { character: null, enemies: {}, countdowns: {}, in_combat: false },
    });
    clearSessionCache('lost-mine');
    expect(getSessionCache('lost-mine')).toBeNull();
  });

  it('isolates cache buckets per campaign id', () => {
    storeSessionCache('lost-mine', {
      sessionId: 'a',
      gameState: { character: null, enemies: {}, countdowns: {}, in_combat: false },
    });
    storeSessionCache('ribcage-coast', {
      sessionId: 'b',
      gameState: { character: null, enemies: {}, countdowns: {}, in_combat: true },
    });

    expect(getSessionCache('lost-mine')?.sessionId).toBe('a');
    expect(getSessionCache('ribcage-coast')?.sessionId).toBe('b');
    expect(getSessionCache('_default')).toBeNull();
  });

  it('persists combat strip fields for session resume (WS-7.3)', () => {
    storeSessionCache('lost-mine', {
      sessionId: 'combat-sess',
      gameState: {
        character: null,
        enemies: {
          g1: {
            name: 'Goblin 1',
            hp: 4,
            hp_max: 5,
            evasion: 12,
            attack_modifier: 0,
            damage: '1d6',
            conditions: [],
          },
        },
        countdowns: {},
        in_combat: true,
        initiative_order: ['Aldric', 'Goblin 1'],
        current_turn_index: 1,
      },
    });

    const cached = getSessionCache('lost-mine');
    expect(cached?.gameState.in_combat).toBe(true);
    expect(cached?.gameState.initiative_order).toEqual(['Aldric', 'Goblin 1']);
    expect(cached?.gameState.current_turn_index).toBe(1);
  });
});
