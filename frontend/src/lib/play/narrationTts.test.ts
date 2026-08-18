import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { apiBaseUrl } from '@/config';
import {
  NARRATION_TTS_DISCLOSURE_VERSION,
  NarrationTtsDisclosureRequiredError,
  acceptNarrationTtsDisclosure,
  narrationTtsDisclosureNeeded,
  readNarrationTtsDisclosure,
  startNarrationSpeech,
  stopCurrentNarrationSpeech,
} from '@/lib/play/narrationTts';

const TEXT = 'The lantern gutters. Something large shifts beyond the door.';
const AUDIO_ID = 'a'.repeat(64);

class FakeAudio {
  /** Built sourceless, exactly like the real element; `src` arrives after registration. */
  src = '';
  pauseCount = 0;
  loadCount = 0;
  playCount = 0;
  playError: Error | null = null;
  private listeners: Record<string, Array<() => void>> = {};

  play(): Promise<void> {
    this.playCount += 1;
    return this.playError ? Promise.reject(this.playError) : Promise.resolve();
  }

  pause(): void {
    this.pauseCount += 1;
  }

  load(): void {
    this.loadCount += 1;
  }

  addEventListener(type: string, listener: () => void): void {
    (this.listeners[type] ??= []).push(listener);
  }

  removeEventListener(type: string, listener: () => void): void {
    this.listeners[type] = (this.listeners[type] ?? []).filter(
      (entry) => entry !== listener,
    );
  }

  emit(type: string): void {
    [...(this.listeners[type] ?? [])].forEach((listener) => listener());
  }

  get listenerCount(): number {
    return Object.values(this.listeners).reduce(
      (total, entries) => total + entries.length,
      0,
    );
  }
}

function audioHarness(configure?: (audio: FakeAudio) => void) {
  const created: FakeAudio[] = [];
  const audioFactory = () => {
    const audio = new FakeAudio();
    configure?.(audio);
    created.push(audio);
    return audio;
  };
  return { created, audioFactory };
}

function abortError(): Error {
  return Object.assign(new Error('Aborted'), { name: 'AbortError' });
}

function registrationFetch(audioId = AUDIO_ID) {
  return vi.fn(async () => ({
    ok: true,
    status: 200,
    json: async () => ({ audio_id: audioId }),
  })) as unknown as typeof fetch;
}

/** Fetch that never settles on its own, so registration can be cancelled mid-flight. */
function pendingFetch() {
  const calls: Array<{ resolve: (value: unknown) => void }> = [];
  const impl = vi.fn((_url: string, init?: { signal?: AbortSignal }) => {
    return new Promise((resolve, reject) => {
      calls.push({ resolve });
      init?.signal?.addEventListener('abort', () => reject(abortError()));
    });
  });
  return { impl: impl as unknown as typeof fetch, calls, spy: impl };
}

function storageMock(): Storage {
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

const STORAGE_KEY = 'virtualgm.narrationTts.disclosure';

function accept() {
  acceptNarrationTtsDisclosure();
}

/** Lets queued microtasks (registration promise chain) run. */
async function flush(): Promise<void> {
  await Promise.resolve();
  await Promise.resolve();
  await Promise.resolve();
}

beforeEach(() => {
  vi.stubGlobal('localStorage', storageMock());
});

afterEach(() => {
  stopCurrentNarrationSpeech();
  vi.unstubAllGlobals();
});

describe('disclosure gating', () => {
  it('is required before any acceptance is stored', () => {
    expect(narrationTtsDisclosureNeeded()).toBe(true);
    expect(readNarrationTtsDisclosure()).toBeNull();
  });

  it('sends nothing while the disclosure is unaccepted (Cancel path)', async () => {
    const fetchImpl = registrationFetch();
    const { created, audioFactory } = audioHarness();

    const attempt = startNarrationSpeech(
      { entryId: 'e1', text: TEXT },
      { fetchImpl, audioFactory },
    );

    await expect(attempt.done).rejects.toBeInstanceOf(
      NarrationTtsDisclosureRequiredError,
    );
    expect(fetchImpl).not.toHaveBeenCalled();
    expect(created).toEqual([]);
  });

  it('records the current version and an acceptance timestamp on Accept', () => {
    accept();

    const record = readNarrationTtsDisclosure();
    expect(record).toMatchObject({ version: NARRATION_TTS_DISCLOSURE_VERSION });
    expect(record!.acceptedAt).toBeGreaterThan(0);
    expect(narrationTtsDisclosureNeeded()).toBe(false);
  });

  it('permits the pending request once the current version is accepted', async () => {
    accept();
    const fetchImpl = registrationFetch();
    const { created, audioFactory } = audioHarness();

    const attempt = startNarrationSpeech(
      { entryId: 'e1', text: TEXT },
      { fetchImpl, audioFactory },
    );
    await flush();
    created[0].emit('ended');

    await expect(attempt.done).resolves.toBe('ended');
    expect(fetchImpl).toHaveBeenCalledTimes(1);
  });

  it('treats a stale acceptance version as unaccepted', async () => {
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({
        version: NARRATION_TTS_DISCLOSURE_VERSION - 1,
        acceptedAt: 1,
      }),
    );

    expect(narrationTtsDisclosureNeeded()).toBe(true);

    const fetchImpl = registrationFetch();
    const attempt = startNarrationSpeech(
      { entryId: 'e1', text: TEXT },
      { fetchImpl, audioFactory: audioHarness().audioFactory },
    );

    await expect(attempt.done).rejects.toBeInstanceOf(
      NarrationTtsDisclosureRequiredError,
    );
    expect(fetchImpl).not.toHaveBeenCalled();
  });

  it('treats unreadable stored acceptance as unaccepted', () => {
    localStorage.setItem(STORAGE_KEY, 'not json');
    expect(narrationTtsDisclosureNeeded()).toBe(true);
  });
});

describe('registration request', () => {
  beforeEach(accept);

  it('posts exactly the supplied text through apiBaseUrl', async () => {
    const fetchImpl = registrationFetch();
    const { created, audioFactory } = audioHarness();

    const attempt = startNarrationSpeech(
      { entryId: 'e1', text: TEXT },
      { fetchImpl, audioFactory },
    );
    await flush();

    const [url, init] = (fetchImpl as unknown as ReturnType<typeof vi.fn>).mock
      .calls[0];
    expect(url).toBe(`${apiBaseUrl}/narration-audio`);
    expect(init.method).toBe('POST');
    expect(JSON.parse(init.body)).toEqual({ text: TEXT });
    expect(created[0].src).toBe(`${apiBaseUrl}/narration-audio/${AUDIO_ID}`);

    attempt.stop();
    await attempt.done;
  });

  it('sends no session id, entry id, or other metadata', async () => {
    const fetchImpl = registrationFetch();
    const attempt = startNarrationSpeech(
      { entryId: 'transcript-entry-42', text: TEXT },
      { fetchImpl, audioFactory: audioHarness().audioFactory },
    );
    await flush();

    const [, init] = (fetchImpl as unknown as ReturnType<typeof vi.fn>).mock
      .calls[0];
    expect(Object.keys(JSON.parse(init.body))).toEqual(['text']);
    expect(init.body).not.toContain('transcript-entry-42');

    attempt.stop();
    await attempt.done;
  });
});

describe('playback lifecycle', () => {
  beforeEach(accept);

  /**
   * Regression: the element used to be built only after registration resolved, so
   * `play()` landed a network round-trip past the click and browsers refused it —
   * the media request was then torn down before it ever left, and the player heard
   * nothing. Priming must happen synchronously, before any await.
   */
  it('builds and primes the element before registration is awaited', () => {
    const { impl } = pendingFetch();
    const { created, audioFactory } = audioHarness();

    // No flush: this is what has run by the time the click handler returns.
    const attempt = startNarrationSpeech(
      { entryId: 'e1', text: TEXT },
      { fetchImpl: impl, audioFactory },
    );

    expect(created).toHaveLength(1);
    expect(created[0].loadCount).toBe(1);
    expect(created[0].src).toBe('');

    attempt.stop();
  });

  it("resolves 'ended' when playback finishes and detaches listeners", async () => {
    const { created, audioFactory } = audioHarness();
    const attempt = startNarrationSpeech(
      { entryId: 'e1', text: TEXT },
      { fetchImpl: registrationFetch(), audioFactory },
    );
    await flush();

    expect(created[0].playCount).toBe(1);
    created[0].emit('ended');

    await expect(attempt.done).resolves.toBe('ended');
    expect(created[0].listenerCount).toBe(0);
    expect(created[0].src).toBe('');
    // Priming at creation, then the teardown reload that releases the media request.
    expect(created[0].loadCount).toBe(2);
  });

  it('reports playback start through onPlaying', async () => {
    const onPlaying = vi.fn();
    const { created, audioFactory } = audioHarness();
    const attempt = startNarrationSpeech(
      { entryId: 'e1', text: TEXT },
      { fetchImpl: registrationFetch(), audioFactory, onPlaying },
    );
    await flush();

    expect(onPlaying).toHaveBeenCalledTimes(1);
    created[0].emit('ended');
    await attempt.done;
  });

  it('stop resolves once and removes the media request', async () => {
    const { created, audioFactory } = audioHarness();
    const attempt = startNarrationSpeech(
      { entryId: 'e1', text: TEXT },
      { fetchImpl: registrationFetch(), audioFactory },
    );
    await flush();

    attempt.stop();
    attempt.stop();
    attempt.stop();

    await expect(attempt.done).resolves.toBe('stopped');
    expect(created[0].pauseCount).toBe(1);
    expect(created[0].src).toBe('');
    expect(created[0].loadCount).toBe(2);
    expect(created[0].listenerCount).toBe(0);
  });

  it('ignores an ended event that arrives after stop', async () => {
    const { created, audioFactory } = audioHarness();
    const attempt = startNarrationSpeech(
      { entryId: 'e1', text: TEXT },
      { fetchImpl: registrationFetch(), audioFactory },
    );
    await flush();

    attempt.stop();
    created[0].emit('ended');

    await expect(attempt.done).resolves.toBe('stopped');
  });

  it('starting another beat stops the current one', async () => {
    const first = audioHarness();
    const attemptA = startNarrationSpeech(
      { entryId: 'a', text: TEXT },
      { fetchImpl: registrationFetch(), audioFactory: first.audioFactory },
    );
    await flush();

    const second = audioHarness();
    const attemptB = startNarrationSpeech(
      { entryId: 'b', text: 'A different beat entirely.' },
      { fetchImpl: registrationFetch('b'.repeat(64)), audioFactory: second.audioFactory },
    );
    await flush();

    await expect(attemptA.done).resolves.toBe('stopped');
    expect(first.created[0].pauseCount).toBe(1);
    expect(first.created[0].src).toBe('');

    second.created[0].emit('ended');
    await expect(attemptB.done).resolves.toBe('ended');
  });

  it('stopCurrentNarrationSpeech stops active playback (leaving the surface)', async () => {
    const { created, audioFactory } = audioHarness();
    const attempt = startNarrationSpeech(
      { entryId: 'e1', text: TEXT },
      { fetchImpl: registrationFetch(), audioFactory },
    );
    await flush();

    stopCurrentNarrationSpeech();

    await expect(attempt.done).resolves.toBe('stopped');
    expect(created[0].pauseCount).toBe(1);
    expect(created[0].listenerCount).toBe(0);
  });
});

describe('cancellation before playback', () => {
  beforeEach(accept);

  it('stop during pending registration aborts and never sources the element', async () => {
    const { impl, spy } = pendingFetch();
    const { created, audioFactory } = audioHarness();

    const attempt = startNarrationSpeech(
      { entryId: 'e1', text: TEXT },
      { fetchImpl: impl, audioFactory },
    );
    attempt.stop();

    await expect(attempt.done).resolves.toBe('stopped');
    // The element is primed during the click, so it exists — but a cancelled
    // attempt must still leave it sourceless and silent, with no media request.
    expect(created).toHaveLength(1);
    expect(created[0].src).toBe('');
    expect(created[0].playCount).toBe(0);
    const init = spy.mock.calls[0][1] as { signal?: AbortSignal };
    expect(init.signal?.aborted).toBe(true);
  });

  it('a stale registration completion after stop never sources the element', async () => {
    const { impl, calls } = pendingFetch();
    const { created, audioFactory } = audioHarness();

    const attempt = startNarrationSpeech(
      { entryId: 'e1', text: TEXT },
      { fetchImpl: impl, audioFactory },
    );
    attempt.stop();

    calls[0].resolve({
      ok: true,
      status: 200,
      json: async () => ({ audio_id: AUDIO_ID }),
    });
    await flush();

    await expect(attempt.done).resolves.toBe('stopped');
    expect(created).toHaveLength(1);
    expect(created[0].src).toBe('');
    expect(created[0].playCount).toBe(0);
  });
});

describe('failures', () => {
  beforeEach(accept);

  it('rejects when registration returns a non-ok status', async () => {
    const fetchImpl = vi.fn(async () => ({
      ok: false,
      status: 429,
      json: async () => ({}),
    })) as unknown as typeof fetch;
    const { created, audioFactory } = audioHarness();

    const attempt = startNarrationSpeech(
      { entryId: 'e1', text: TEXT },
      { fetchImpl, audioFactory },
    );

    await expect(attempt.done).rejects.toThrow(/429/);
    // A rejected registration leaves the primed element sourceless and silent.
    expect(created).toHaveLength(1);
    expect(created[0].src).toBe('');
    expect(created[0].playCount).toBe(0);
  });

  it('rejects when registration returns no audio id', async () => {
    const fetchImpl = vi.fn(async () => ({
      ok: true,
      status: 200,
      json: async () => ({}),
    })) as unknown as typeof fetch;

    const attempt = startNarrationSpeech(
      { entryId: 'e1', text: TEXT },
      { fetchImpl, audioFactory: audioHarness().audioFactory },
    );

    await expect(attempt.done).rejects.toThrow(/narration audio/i);
  });

  it('rejects and tears down when the media element errors', async () => {
    const { created, audioFactory } = audioHarness();
    const attempt = startNarrationSpeech(
      { entryId: 'e1', text: TEXT },
      { fetchImpl: registrationFetch(), audioFactory },
    );
    await flush();

    created[0].emit('error');

    await expect(attempt.done).rejects.toThrow(/playback/i);
    expect(created[0].pauseCount).toBe(1);
    expect(created[0].src).toBe('');
    expect(created[0].listenerCount).toBe(0);
  });

  it('rejects when play() is refused', async () => {
    const { created, audioFactory } = audioHarness((audio) => {
      audio.playError = new Error('NotAllowedError');
    });
    const attempt = startNarrationSpeech(
      { entryId: 'e1', text: TEXT },
      { fetchImpl: registrationFetch(), audioFactory },
    );

    await expect(attempt.done).rejects.toThrow();
    expect(created[0].src).toBe('');
    expect(created[0].listenerCount).toBe(0);
  });

  it('a failed attempt does not leave itself as the preemption target', async () => {
    const fetchImpl = vi.fn(async () => ({
      ok: false,
      status: 502,
      json: async () => ({}),
    })) as unknown as typeof fetch;

    const failed = startNarrationSpeech(
      { entryId: 'e1', text: TEXT },
      { fetchImpl, audioFactory: audioHarness().audioFactory },
    );
    await expect(failed.done).rejects.toThrow();

    const { created, audioFactory } = audioHarness();
    const attempt = startNarrationSpeech(
      { entryId: 'e2', text: TEXT },
      { fetchImpl: registrationFetch(), audioFactory },
    );
    await flush();
    created[0].emit('ended');

    await expect(attempt.done).resolves.toBe('ended');
  });
});
