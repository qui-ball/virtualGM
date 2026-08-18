/**
 * Narration text-to-speech: disclosure gating plus one cancellable playback attempt.
 *
 * Registration, media fetching, and playback are a single attempt (KTD7) so a click
 * that lands mid-registration, a preempting click on another beat, or an unmount can
 * never leave an orphaned request or a still-playing element behind.
 *
 * All playback state lives here rather than in the React component (KTD6) — frontend
 * tests run in Node without jsdom, so the component stays thin and this stays testable
 * through an injectable audio factory.
 */

import { apiBaseUrl } from '@/config';

/**
 * Bump whenever the processors, what is sent, or the disclosure copy change
 * materially. A stored acceptance below this version behaves as unaccepted (R11).
 */
export const NARRATION_TTS_DISCLOSURE_VERSION = 2;

const DISCLOSURE_STORAGE_KEY = 'virtualgm.narrationTts.disclosure';

export type NarrationTtsDisclosureRecord = {
  version: number;
  acceptedAt: number;
};

/** Thrown instead of contacting the backend when disclosure is missing or stale. */
export class NarrationTtsDisclosureRequiredError extends Error {
  constructor() {
    super('Narration speech disclosure has not been accepted');
    this.name = 'NarrationTtsDisclosureRequiredError';
  }
}

function disclosureStorage(): Storage | null {
  try {
    return globalThis.localStorage ?? null;
  } catch {
    // Storage can throw outright when blocked by browser settings.
    return null;
  }
}

export function readNarrationTtsDisclosure(): NarrationTtsDisclosureRecord | null {
  const storage = disclosureStorage();
  if (!storage) return null;

  try {
    const raw = storage.getItem(DISCLOSURE_STORAGE_KEY);
    if (!raw) return null;
    const parsed: unknown = JSON.parse(raw);
    if (typeof parsed !== 'object' || parsed === null) return null;
    const { version, acceptedAt } =
      parsed as Partial<NarrationTtsDisclosureRecord>;
    if (typeof version !== 'number' || typeof acceptedAt !== 'number')
      return null;
    return { version, acceptedAt };
  } catch {
    return null;
  }
}

/** True when the player must see (or re-see) the processor disclosure. */
export function narrationTtsDisclosureNeeded(): boolean {
  const record = readNarrationTtsDisclosure();
  return record === null || record.version < NARRATION_TTS_DISCLOSURE_VERSION;
}

export function acceptNarrationTtsDisclosure(): NarrationTtsDisclosureRecord {
  const record: NarrationTtsDisclosureRecord = {
    version: NARRATION_TTS_DISCLOSURE_VERSION,
    acceptedAt: Date.now(),
  };
  try {
    disclosureStorage()?.setItem(
      DISCLOSURE_STORAGE_KEY,
      JSON.stringify(record)
    );
  } catch {
    // A blocked write only costs the player another disclosure next time.
  }
  return record;
}

export function clearNarrationTtsDisclosure(): void {
  try {
    disclosureStorage()?.removeItem(DISCLOSURE_STORAGE_KEY);
  } catch {
    // Nothing to do — the acceptance simply stays as it was.
  }
}

// -- Playback --

export type NarrationSpeechRequest = {
  entryId: string;
  /** Exactly the sanitized text shown in the bubble. Nothing else is sent (R4). */
  text: string;
};

/** The subset of `HTMLAudioElement` playback needs, so tests can supply their own. */
export interface NarrationAudio {
  src: string;
  play(): Promise<void>;
  pause(): void;
  load(): void;
  addEventListener(type: string, listener: () => void): void;
  removeEventListener(type: string, listener: () => void): void;
}

/**
 * Builds the element with no source. The URL is unknown until registration returns,
 * so the source is assigned later — see `createAttempt` for why the element itself
 * has to exist before then.
 */
export type NarrationAudioFactory = () => NarrationAudio;

export type NarrationSpeechOptions = {
  fetchImpl?: typeof fetch;
  audioFactory?: NarrationAudioFactory;
  baseUrl?: string;
  /** Fired once audio actually begins, so the control can leave its loading state. */
  onPlaying?: () => void;
};

/** `ended` means playback ran out; `stopped` means someone cancelled it on purpose. */
export type NarrationSpeechOutcome = 'ended' | 'stopped';

export type NarrationSpeechAttempt = {
  /** Resolves on end or stop; rejects on registration or media failure. */
  done: Promise<NarrationSpeechOutcome>;
  stop: () => void;
};

function defaultAudioFactory(): NarrationAudio {
  const element = new Audio();
  element.preload = 'auto';
  return element;
}

function isAbortError(error: unknown): boolean {
  return error instanceof Error && error.name === 'AbortError';
}

let currentAttempt: NarrationSpeechAttempt | null = null;

/** Stop whatever is playing — preemption, unmount, or leaving the play surface (R3). */
export function stopCurrentNarrationSpeech(): void {
  currentAttempt?.stop();
  currentAttempt = null;
}

/**
 * Begin one narration playback attempt. Returns synchronously so the caller can
 * cancel while registration is still in flight.
 */
export function startNarrationSpeech(
  request: NarrationSpeechRequest,
  options: NarrationSpeechOptions = {}
): NarrationSpeechAttempt {
  if (narrationTtsDisclosureNeeded()) {
    // Nothing leaves the browser until the current disclosure version is accepted.
    return {
      done: Promise.reject(new NarrationTtsDisclosureRequiredError()),
      stop: () => {},
    };
  }

  stopCurrentNarrationSpeech();

  const attempt = createAttempt(request, options);
  currentAttempt = attempt;
  attempt.done
    .catch(() => undefined)
    .then(() => {
      if (currentAttempt === attempt) currentAttempt = null;
    });
  return attempt;
}

function createAttempt(
  request: NarrationSpeechRequest,
  options: NarrationSpeechOptions
): NarrationSpeechAttempt {
  const fetchImpl = options.fetchImpl ?? globalThis.fetch;
  const audioFactory = options.audioFactory ?? defaultAudioFactory;
  const baseUrl = options.baseUrl ?? apiBaseUrl;

  const controller = new AbortController();
  let settled = false;
  let audio: NarrationAudio | null = null;
  let detach: (() => void) | null = null;

  let resolve!: (outcome: NarrationSpeechOutcome) => void;
  let reject!: (error: Error) => void;
  const done = new Promise<NarrationSpeechOutcome>((res, rej) => {
    resolve = res;
    reject = rej;
  });

  /** Detach listeners, pause, clear src, and load — the full media-request release. */
  const teardown = () => {
    detach?.();
    detach = null;
    if (audio) {
      audio.pause();
      audio.src = '';
      audio.load();
      audio = null;
    }
  };

  const finish = (outcome: NarrationSpeechOutcome) => {
    if (settled) return;
    settled = true;
    teardown();
    resolve(outcome);
  };

  const fail = (error: Error) => {
    if (settled) return;
    settled = true;
    controller.abort();
    teardown();
    reject(error);
  };

  const stop = () => {
    if (settled) return;
    controller.abort();
    finish('stopped');
  };

  // Built and primed here, still inside the click's own task. Registration is a
  // network round-trip, so by the time it resolves the user activation that
  // authorised playback is spent and `play()` below would be refused outright —
  // silently, since the rejection only reaches the button's error glyph. Calling
  // `load()` while the gesture is live is what keeps that activation attached to
  // this element, so assigning `src` after registration still plays.
  const element = audioFactory();
  audio = element;
  element.load();

  const run = async () => {
    try {
      const response = await fetchImpl(`${baseUrl}/narration-audio`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: request.text }),
        signal: controller.signal,
      });
      if (settled) return;
      if (!response.ok) {
        throw new Error(
          `Narration audio registration failed: ${response.status}`
        );
      }

      const payload = (await response.json()) as { audio_id?: string };
      if (settled) return;
      const audioId = payload?.audio_id;
      if (!audioId) {
        throw new Error('Narration audio registration returned no id');
      }

      // Listeners go on before the source, so the first media task can already
      // find them; media events are queued, never fired synchronously.
      const onEnded = () => finish('ended');
      const onError = () => fail(new Error('Narration audio playback failed'));
      element.addEventListener('ended', onEnded);
      element.addEventListener('error', onError);
      detach = () => {
        element.removeEventListener('ended', onEnded);
        element.removeEventListener('error', onError);
      };

      // Assigning `src` re-runs the media load algorithm on its own — this is the
      // point where the GET for the audio is finally issued.
      element.src = `${baseUrl}/narration-audio/${encodeURIComponent(audioId)}`;

      await element.play();
      if (settled) return;
      options.onPlaying?.();
    } catch (error) {
      if (settled) return;
      if (isAbortError(error)) {
        finish('stopped');
        return;
      }
      fail(
        error instanceof Error ? error : new Error('Narration audio failed')
      );
    }
  };

  void run();

  return { done, stop };
}
