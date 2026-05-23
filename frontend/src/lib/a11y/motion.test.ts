import { afterEach, describe, expect, it, vi } from 'vitest';
import { prefersReducedMotion } from '@/lib/a11y/motion';

describe('prefersReducedMotion', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('returns false when matchMedia is unavailable', () => {
    vi.stubGlobal('window', {});
    expect(prefersReducedMotion()).toBe(false);
  });

  it('returns true when reduce motion is preferred', () => {
    vi.stubGlobal('window', {
      matchMedia: (query: string) => ({
        matches: query.includes('reduce'),
        media: query,
      }),
    });
    expect(prefersReducedMotion()).toBe(true);
  });
});
