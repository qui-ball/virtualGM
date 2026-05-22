/** Level-up XP thresholds (aligned with backend XP_THRESHOLDS). */
export const XP_THRESHOLDS: Record<number, number> = {
  2: 100,
  3: 250,
  4: 500,
  5: 1_000,
  6: 2_000,
  7: 4_000,
  8: 7_000,
  9: 11_000,
  10: 16_000,
};

export function xpToReachLevel(level: number): number | null {
  return XP_THRESHOLDS[level] ?? null;
}

export function isPendingLevelUp(xp: number, level: number): boolean {
  const next = xpToReachLevel(level + 1);
  return next != null && xp >= next;
}
