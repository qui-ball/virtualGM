import { describe, expect, it, vi } from 'vitest';
import {
  appendThinking,
  DEBUG_CONSOLE_STORAGE_KEY,
  DEBUG_THINKING_STORAGE_KEY,
  DEV_DEBUG_ACTIONS,
  readDebugConsoleOpen,
  readDebugThinkingOn,
  THINKING_LOG_LIMIT,
  writeDebugConsoleOpen,
  writeDebugThinkingOn,
} from '@/lib/play/devDebugConsole';

function stubStorage() {
  const store = new Map<string, string>();
  vi.stubGlobal('localStorage', {
    getItem: (key: string) => store.get(key) ?? null,
    setItem: (key: string, value: string) => {
      store.set(key, value);
    },
    removeItem: (key: string) => {
      store.delete(key);
    },
    clear: () => store.clear(),
  });
  return store;
}

describe('devDebugConsole', () => {
  it('persists open state when localStorage is available', () => {
    const store = stubStorage();

    expect(readDebugConsoleOpen()).toBe(false);
    writeDebugConsoleOpen(true);
    expect(readDebugConsoleOpen()).toBe(true);
    expect(store.get(DEBUG_CONSOLE_STORAGE_KEY)).toBe('1');
  });

  it('catalog covers WS-7 and layout triggers', () => {
    const ids = DEV_DEBUG_ACTIONS.map((a) => a.id);
    expect(ids).toContain('level_up_pending');
    expect(ids).toContain('boss_zero');
    expect(ids).toContain('open_cast_tray');
    expect(DEV_DEBUG_ACTIONS.some((a) => a.scope === 'layout')).toBe(true);
  });

  it('registers the thinking toggle as a chat-scoped diagnostics action', () => {
    const action = DEV_DEBUG_ACTIONS.find((a) => a.id === 'toggle_thinking');

    expect(action).toBeDefined();
    expect(action?.category).toBe('Diagnostics');
    expect(action?.scope).toBe('chat');
  });

  it('defaults thinking off and persists the toggle across a reload', () => {
    const store = stubStorage();

    expect(readDebugThinkingOn()).toBe(false);

    writeDebugThinkingOn(true);
    expect(store.get(DEBUG_THINKING_STORAGE_KEY)).toBe('1');
    // A reload re-reads from the same key.
    expect(readDebugThinkingOn()).toBe(true);

    writeDebugThinkingOn(false);
    expect(readDebugThinkingOn()).toBe(false);
  });

  it('keeps the thinking toggle on its own key, independent of console open state', () => {
    stubStorage();

    writeDebugConsoleOpen(true);
    expect(readDebugThinkingOn()).toBe(false);

    writeDebugThinkingOn(true);
    expect(readDebugConsoleOpen()).toBe(true);
  });
});

describe('appendThinking', () => {
  it('collects blocks in arrival order', () => {
    const log = appendThinking(appendThinking([], 'first'), 'second');

    expect(log).toEqual(['first', 'second']);
  });

  it('ignores blank blocks', () => {
    const log = ['first'];

    expect(appendThinking(log, '   ')).toBe(log);
    expect(appendThinking(log, '')).toBe(log);
  });

  it('keeps only the most recent entries', () => {
    let log: string[] = [];
    for (let i = 0; i < THINKING_LOG_LIMIT + 10; i++) {
      log = appendThinking(log, `block ${i}`);
    }

    expect(log).toHaveLength(THINKING_LOG_LIMIT);
    expect(log[log.length - 1]).toBe(`block ${THINKING_LOG_LIMIT + 9}`);
    expect(log[0]).toBe('block 10');
  });

  it('does not mutate the log it is given', () => {
    const log = ['first'];
    appendThinking(log, 'second');

    expect(log).toEqual(['first']);
  });
});
