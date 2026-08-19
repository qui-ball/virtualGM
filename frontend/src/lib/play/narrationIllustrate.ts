/**
 * Image-generation entry point for GM narration illustrations.
 *
 * Colleague will wire a real backend here. Callers should treat failures as
 * soft (button returns to idle) — never dump into the transcript.
 */

export type NarrationIllustrateRequest = {
  entryId: string;
  text: string;
};

/**
 * Request an illustration of a settled GM narration.
 * Currently a stub — no-ops until the image API is connected.
 */
export async function illustrateNarration(
  _request: NarrationIllustrateRequest,
): Promise<void> {
  // Placeholder: swap for POST /illustrate (or similar) + image display.
}
