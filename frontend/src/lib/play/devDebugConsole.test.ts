import { describe, expect, it, vi } from 'vitest';
import {
  DEBUG_CONSOLE_STORAGE_KEY,
  DEV_DEBUG_ACTIONS,
  readDebugConsoleOpen,
  writeDebugConsoleOpen,
} from '@/lib/play/devDebugConsole';

describe('devDebugConsole', () => {
  it('persists open state when localStorage is available', () => {
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
});
