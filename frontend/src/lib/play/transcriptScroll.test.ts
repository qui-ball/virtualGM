import { describe, expect, it } from 'vitest';
import {
  FOLLOW_THRESHOLD_PX,
  isAtTail,
  nextFollowState,
  tailScrollTop,
} from '@/lib/play/transcriptScroll';

const viewport = (scrollTop: number, scrollHeight: number) => ({
  scrollTop,
  scrollHeight,
  clientHeight: 500,
});

describe('tailScrollTop', () => {
  it('puts the newest line at the bottom edge', () => {
    expect(tailScrollTop(viewport(0, 2000))).toBe(1500);
  });

  it('never asks for a negative offset when the content fits', () => {
    expect(tailScrollTop(viewport(0, 200))).toBe(0);
  });
});

describe('isAtTail', () => {
  it('counts a reader just above the bottom as at the tail', () => {
    expect(isAtTail(viewport(1500 - FOLLOW_THRESHOLD_PX, 2000))).toBe(true);
  });

  it('does not count a reader further up', () => {
    expect(isAtTail(viewport(1000, 2000))).toBe(false);
  });
});

describe('nextFollowState', () => {
  it('keeps following while narration grows the transcript underneath', () => {
    // The tail ran far past the reader between frames, but they never scrolled.
    expect(
      nextFollowState({
        following: true,
        metrics: viewport(1500, 4000),
        lastScrollTop: 1500,
      }),
    ).toBe(true);
  });

  it('stops following when the reader scrolls up to check something', () => {
    expect(
      nextFollowState({
        following: true,
        metrics: viewport(600, 2000),
        lastScrollTop: 1500,
      }),
    ).toBe(false);
  });

  it('keeps following through our own jump to the tail', () => {
    expect(
      nextFollowState({
        following: true,
        metrics: viewport(3500, 4000),
        lastScrollTop: 1500,
      }),
    ).toBe(true);
  });

  it('resumes following once the reader returns to the tail', () => {
    expect(
      nextFollowState({
        following: false,
        metrics: viewport(3500, 4000),
        lastScrollTop: 3000,
      }),
    ).toBe(true);
  });

  it('stays paused while the reader browses further down but off the tail', () => {
    expect(
      nextFollowState({
        following: false,
        metrics: viewport(2000, 4000),
        lastScrollTop: 1900,
      }),
    ).toBe(false);
  });
});
