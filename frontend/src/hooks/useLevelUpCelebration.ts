import { useCallback, useEffect, useRef, useState } from 'react';
import { prefersReducedMotion } from '@/lib/a11y/motion';
import type { CombatSplashPhase } from '@/hooks/useCombatMode';

export type LevelUpCelebrationPhase = 'idle' | 'splash' | 'dialog';

const SPLASH_MS = 3200;
const REDUCED_MS = 900;

/**
 * Level-up celebration sequence after combat/narration settle:
 * idle → splash (green flash) → dialog (choice UI).
 */
export function advanceLevelUpCelebration(
  pending: boolean,
  combatSplashIdle: boolean,
  narrationQuiet: boolean,
  phase: LevelUpCelebrationPhase,
): LevelUpCelebrationPhase {
  if (!pending) return 'idle';
  if (!combatSplashIdle || !narrationQuiet) {
    // Hold splash/dialog if already shown; otherwise wait.
    return phase === 'idle' ? 'idle' : phase;
  }
  if (phase === 'idle') return 'splash';
  return phase;
}

export function useLevelUpCelebration(
  pending: boolean,
  combatSplashPhase: CombatSplashPhase,
  narrationQuiet: boolean,
) {
  const [phase, setPhase] = useState<LevelUpCelebrationPhase>('idle');
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const clearTimer = useCallback(() => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  const dismissSplash = useCallback(() => {
    clearTimer();
    setPhase((p) => (p === 'splash' ? 'dialog' : p));
  }, [clearTimer]);

  useEffect(() => {
    const combatIdle = combatSplashPhase === 'idle';
    setPhase((prev) =>
      advanceLevelUpCelebration(pending, combatIdle, narrationQuiet, prev),
    );
  }, [pending, combatSplashPhase, narrationQuiet]);

  useEffect(() => {
    if (phase !== 'splash') {
      clearTimer();
      return;
    }
    const reduced = prefersReducedMotion();
    timerRef.current = setTimeout(
      dismissSplash,
      reduced ? REDUCED_MS : SPLASH_MS,
    );
    return clearTimer;
  }, [phase, dismissSplash, clearTimer]);

  useEffect(() => () => clearTimer(), [clearTimer]);

  return {
    phase,
    dismissSplash,
    showSplash: phase === 'splash',
    showDialog: phase === 'dialog',
  };
}
