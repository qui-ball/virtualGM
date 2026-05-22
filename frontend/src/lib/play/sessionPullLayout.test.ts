import { describe, expect, it } from 'vitest';
import {
  buildSessionPullMeasure,
  sessionFixedChromeWhenOpen,
  sessionPullConfig,
} from '@/lib/play/sessionPullLayout';
import { PHASE1_MAX } from '@/lib/play/sessionConstants';

const PHONE_CHROME: Parameters<typeof sessionFixedChromeWhenOpen>[1] = {
  appBar: 72,
  vitalStrip: 56,
  pullHandle: 28,
  composer: 68,
};

describe('buildSessionPullMeasure', () => {
  it('counts pull handle in sheet chrome, composer in footer only', () => {
    expect(buildSessionPullMeasure(PHONE_CHROME)).toEqual({
      chromeAbovePull: 72 + 56 + 28,
      footerChrome: 68,
    });
  });
});

describe('sessionPullConfig (pinned composer layout)', () => {
  it('full pull fits remaining space below app bar, vitals, and pull handle', () => {
    const container = 640;
    const { fullPullMax } = sessionPullConfig(container, PHONE_CHROME);
    expect(fullPullMax).toBe(container - 156 - 68);
  });

  it('never inflates past viewport on short screens', () => {
    const container = 480;
    const { fullPullMax } = sessionPullConfig(container, PHONE_CHROME);
    expect(fullPullMax).toBe(container - 156 - 68);
    expect(fullPullMax + 156 + 68).toBe(container);
  });
});

describe('sessionFixedChromeWhenOpen', () => {
  it('uses exactly the container height when sheet is fully open', () => {
    const container = 640;
    const { topH, botH, totalHeight, config } = sessionFixedChromeWhenOpen(
      container,
      PHONE_CHROME,
    );
    expect(topH).toBe(PHASE1_MAX);
    expect(botH).toBe(config.fullPullMax - PHASE1_MAX);
    expect(totalHeight).toBe(container);
  });

  it('leaves phase 2 height for sheet body only', () => {
    const { botH, config } = sessionFixedChromeWhenOpen(700, PHONE_CHROME);
    expect(botH).toBe(config.fullPullMax - PHASE1_MAX);
    expect(botH).toBeGreaterThan(0);
  });
});
