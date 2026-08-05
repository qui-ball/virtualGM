import { prefersReducedMotion } from '@/lib/a11y/motion';
import type { DiceType } from '@/types';

export type DiceAnimationRequest = {
  diceType: DiceType;
  rolls: number[];
};

/** Library d100 is a tens die (00/10/…), not 1–100 — skip animation. */
export const DICE_ANIMATION_UNSUPPORTED: ReadonlySet<DiceType> = new Set([
  'd100',
]);

export const DICE_ANIMATION_TIMEOUT_MS = 7_000;

type DiceAnimationPlayer = (notation: string) => Promise<void>;

let player: DiceAnimationPlayer | null = null;
let dismissOverlay: (() => void) | null = null;

/** Register the mounted overlay player (or null on unmount). */
export function registerDiceAnimationPlayer(
  next: DiceAnimationPlayer | null,
): void {
  player = next;
}

/** Register a force-dismiss for the overlay (timeout / error). */
export function registerDiceAnimationDismiss(next: (() => void) | null): void {
  dismissOverlay = next;
}

export function buildForcedNotation(
  req: DiceAnimationRequest,
): string | null {
  const { diceType, rolls } = req;
  if (rolls.length === 0) return null;
  if (!rolls.every((n) => Number.isInteger(n) && n > 0)) return null;

  const sides = Number(diceType.slice(1));
  if (!Number.isFinite(sides) || sides < 2) return null;
  if (rolls.some((n) => n > sides)) return null;

  return `${rolls.length}${diceType}@${rolls.join(',')}`;
}

export function shouldSkipDiceAnimation(req: DiceAnimationRequest): boolean {
  if (prefersReducedMotion()) return true;
  if (DICE_ANIMATION_UNSUPPORTED.has(req.diceType)) return true;
  if (buildForcedNotation(req) == null) return true;
  return false;
}

/**
 * Play the predetermined dice animation if a player is mounted and the roll
 * is eligible. Always resolves (never rejects) so roll flow cannot stick.
 */
export async function playDiceAnimation(
  req: DiceAnimationRequest,
): Promise<void> {
  if (shouldSkipDiceAnimation(req)) return;
  const notation = buildForcedNotation(req);
  if (!notation || !player) return;

  let timer: ReturnType<typeof setTimeout> | undefined;
  try {
    await new Promise<void>((resolve, reject) => {
      timer = setTimeout(() => {
        reject(new Error('dice animation timeout'));
      }, DICE_ANIMATION_TIMEOUT_MS);

      void player!(notation).then(resolve, reject);
    });
  } catch {
    // Overlay / WebGL / timeout — continue with math results.
    dismissOverlay?.();
  } finally {
    if (timer != null) clearTimeout(timer);
  }
}
