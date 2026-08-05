/**
 * TTS entry point for GM narration playback.
 *
 * Colleague will wire a real backend/TTS provider here. Callers should treat
 * failures as soft (button returns to idle) — never dump into the transcript.
 */

export type NarrationSpeechRequest = {
  entryId: string;
  text: string;
};

export type NarrationSpeechHandle = {
  /** Resolves when playback finishes or is stopped. */
  done: Promise<void>;
  stop: () => void;
};

/**
 * Request spoken playback of a settled GM narration.
 * Currently a stub — throws until the TTS API is connected.
 */
export async function playNarrationSpeech(
  _request: NarrationSpeechRequest,
): Promise<NarrationSpeechHandle> {
  // Placeholder: swap for POST /tts (or similar) + audio element playback.
  throw new Error('Narration TTS is not available yet');
}
