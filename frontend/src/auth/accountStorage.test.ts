import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  ACCOUNT_ID_KEY,
  ACCOUNT_NAME_KEY,
  clearStoredAccount,
  readStoredAccount,
  writeStoredAccount,
} from '@/auth/accountStorage';
import { archiveSummariesToEntries } from '@/lib/play/sessionStart';

describe('accountStorage', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('round-trips soft account in localStorage', () => {
    const store = new Map<string, string>();
    vi.stubGlobal('window', {
      localStorage: {
        getItem: (k: string) => store.get(k) ?? null,
        setItem: (k: string, v: string) => {
          store.set(k, v);
        },
        removeItem: (k: string) => {
          store.delete(k);
        },
      },
    });

    clearStoredAccount();
    expect(readStoredAccount()).toBeNull();
    writeStoredAccount({
      id: 'c0000002-0000-4000-8000-000000000001',
      displayName: 'Qui',
    });
    expect(store.get(ACCOUNT_ID_KEY)).toBe(
      'c0000002-0000-4000-8000-000000000001',
    );
    expect(store.get(ACCOUNT_NAME_KEY)).toBe('Qui');
    expect(readStoredAccount()?.displayName).toBe('Qui');
    clearStoredAccount();
    expect(readStoredAccount()).toBeNull();
  });
});

describe('archiveSummariesToEntries', () => {
  it('orders summary blocks for StoryStack', () => {
    const entries = archiveSummariesToEntries({
      summaries: [
        { segment_index: 2, summary_text: 'Second arc' },
        { segment_index: 1, summary_text: 'First arc' },
      ],
      entries: [],
    });
    expect(entries).toHaveLength(2);
    expect(entries[0]).toMatchObject({
      kind: 'summary',
      segmentIndex: 1,
      text: 'First arc',
    });
    expect(entries[1]).toMatchObject({
      kind: 'summary',
      segmentIndex: 2,
      text: 'Second arc',
    });
  });
});
