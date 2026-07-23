import { useCallback, useEffect, useRef, useState } from 'react';
import { prefersReducedMotion } from '@/lib/a11y/motion';

export type CombatSplashPhase = 'idle' | 'enter' | 'exit';

/** Pure edge detection for splash (session bootstrap skips when prev is null). */
export function combatSplashOnTransition(
  prevInCombat: boolean | null,
  inCombat: boolean,
): CombatSplashPhase | null {
  if (prevInCombat === null || prevInCombat === inCombat) return null;
  return inCombat ? 'enter' : 'exit';
}

/** Pure splash state step — mirrors `useCombatMode` edge detection (testable WS-7.1). */
export function advanceCombatSplashState(
  prevInCombat: boolean | null,
  inCombat: boolean,
  splashPhase: CombatSplashPhase,
): { prevInCombat: boolean; splashPhase: CombatSplashPhase } {
  if (prevInCombat === null) {
    return { prevInCombat: inCombat, splashPhase };
  }
  if (prevInCombat === inCombat) {
    return { prevInCombat, splashPhase };
  }
  const transition = combatSplashOnTransition(prevInCombat, inCombat);
  return {
    prevInCombat: inCombat,
    splashPhase: transition ?? splashPhase,
  };
}

const ENTER_MS = 3000;
const EXIT_MS = 3000;
const REDUCED_MS = 800;

export function useCombatMode(inCombat: boolean) {
  const [splashPhase, setSplashPhase] = useState<CombatSplashPhase>('idle');
  const prevInCombat = useRef<boolean | null>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const clearTimer = useCallback(() => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  const dismissSplash = useCallback(() => {
    clearTimer();
    setSplashPhase('idle');
  }, [clearTimer]);

  useEffect(() => {
    if (prevInCombat.current === null) {
      prevInCombat.current = inCombat;
      return;
    }

    if (prevInCombat.current === inCombat) return;

    clearTimer();
    const reduced = prefersReducedMotion();
    const transition = combatSplashOnTransition(
      prevInCombat.current,
      inCombat,
    );

    if (transition === 'enter') {
      setSplashPhase('enter');
      timerRef.current = setTimeout(
        dismissSplash,
        reduced ? REDUCED_MS : ENTER_MS,
      );
    } else if (transition === 'exit') {
      setSplashPhase('exit');
      timerRef.current = setTimeout(
        dismissSplash,
        reduced ? REDUCED_MS : EXIT_MS,
      );
    }

    prevInCombat.current = inCombat;
  }, [inCombat, clearTimer, dismissSplash]);

  useEffect(() => () => clearTimer(), [clearTimer]);

  return { splashPhase, dismissSplash };
}
