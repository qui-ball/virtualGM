import { useState, useEffect } from 'react';

/** Breakpoint names aligned with design: mobile < 768px, tablet 768–1024px, desktop > 1024px */
export type Breakpoint = 'mobile' | 'tablet' | 'desktop';

const TABLET_MIN = 768;
const DESKTOP_MIN = 1024;

function getBreakpoint(width: number): Breakpoint {
  if (width >= DESKTOP_MIN) return 'desktop';
  if (width >= TABLET_MIN) return 'tablet';
  return 'mobile';
}

/**
 * Returns the current breakpoint based on window width (mobile / tablet / desktop).
 * Updates on resize. SSR-safe: returns 'mobile' until mounted.
 */
export function useBreakpoint(): Breakpoint {
  const [breakpoint, setBreakpoint] = useState<Breakpoint>(() => 'mobile');

  useEffect(() => {
    const update = () => setBreakpoint(getBreakpoint(window.innerWidth));
    update();
    window.addEventListener('resize', update);
    return () => window.removeEventListener('resize', update);
  }, []);

  return breakpoint;
}

/**
 * Returns true if viewport is at least tablet width (768px).
 */
export function useIsTabletOrUp(): boolean {
  const bp = useBreakpoint();
  return bp === 'tablet' || bp === 'desktop';
}

/**
 * Returns true if viewport is at least desktop width (1024px).
 */
export function useIsDesktop(): boolean {
  const bp = useBreakpoint();
  return bp === 'desktop';
}
