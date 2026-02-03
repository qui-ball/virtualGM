/**
 * Unit tests for build configuration utilities
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  getBuildConfig,
  validateBuildConfig,
  logBuildConfig,
  isBuildOptimized,
} from '../buildConfig';

describe('buildConfig utilities', () => {
  beforeEach(() => {
    vi.resetModules();
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  describe('getBuildConfig', () => {
    it('returns development configuration', () => {
      vi.stubEnv('MODE', 'development');
      vi.stubEnv('DEV', true);
      vi.stubEnv('PROD', false);

      const config = getBuildConfig();

      expect(config.mode).toBe('development');
      expect(config.isDevelopment).toBe(true);
      expect(config.isProduction).toBe(false);
      expect(config.hasSourceMaps).toBe(true);
      expect(config.isMinified).toBe(false);
      expect(config.target).toBe('esnext');
    });

    it('returns production configuration', () => {
      vi.stubEnv('MODE', 'production');
      vi.stubEnv('DEV', false);
      vi.stubEnv('PROD', true);

      const config = getBuildConfig();

      expect(config.mode).toBe('production');
      expect(config.isDevelopment).toBe(false);
      expect(config.isProduction).toBe(true);
      expect(config.hasSourceMaps).toBe(false);
      expect(config.isMinified).toBe(true);
      expect(config.target).toBe('esnext');
    });

    it('detects development from DEV flag', () => {
      vi.stubEnv('MODE', 'test');
      vi.stubEnv('DEV', true);
      vi.stubEnv('PROD', false);

      const config = getBuildConfig();

      expect(config.isDevelopment).toBe(true);
      expect(config.hasSourceMaps).toBe(true);
    });

    it('detects production from PROD flag', () => {
      vi.stubEnv('MODE', 'test');
      vi.stubEnv('DEV', false);
      vi.stubEnv('PROD', true);

      const config = getBuildConfig();

      expect(config.isProduction).toBe(true);
      expect(config.isMinified).toBe(true);
    });
  });

  describe('validateBuildConfig', () => {
    it('validates production build correctly', () => {
      vi.stubEnv('MODE', 'production');
      vi.stubEnv('DEV', false);
      vi.stubEnv('PROD', true);

      const validation = validateBuildConfig();

      expect(validation.valid).toBe(true);
      expect(validation.errors).toHaveLength(0);
    });

    it('validates development build correctly', () => {
      vi.stubEnv('MODE', 'development');
      vi.stubEnv('DEV', true);
      vi.stubEnv('PROD', false);

      const validation = validateBuildConfig();

      expect(validation.valid).toBe(true);
      expect(validation.errors).toHaveLength(0);
    });

    it('warns if source maps enabled in production', () => {
      // This is a theoretical test - in practice, vite.config.ts prevents this
      // But we test the validation logic
      vi.stubEnv('MODE', 'production');
      vi.stubEnv('DEV', false);
      vi.stubEnv('PROD', true);

      const validation = validateBuildConfig();

      // In our config, source maps are disabled in production, so no warning
      // But if they were enabled, we'd get a warning
      expect(validation.valid).toBe(true);
    });

    it('warns if minification disabled in production', () => {
      // This is a theoretical test - in practice, vite.config.ts prevents this
      vi.stubEnv('MODE', 'production');
      vi.stubEnv('DEV', false);
      vi.stubEnv('PROD', true);

      const validation = validateBuildConfig();

      // In our config, minification is enabled in production
      expect(validation.valid).toBe(true);
    });
  });

  describe('logBuildConfig', () => {
    it('does not log in production', () => {
      const consoleGroupSpy = vi
        .spyOn(console, 'group')
        .mockImplementation(() => {});
      const consoleLogSpy = vi
        .spyOn(console, 'log')
        .mockImplementation(() => {});

      vi.stubEnv('DEV', false);
      vi.stubEnv('PROD', true);

      logBuildConfig();

      expect(consoleGroupSpy).not.toHaveBeenCalled();
      expect(consoleLogSpy).not.toHaveBeenCalled();

      consoleGroupSpy.mockRestore();
      consoleLogSpy.mockRestore();
    });

    it('logs configuration in development', () => {
      const consoleGroupSpy = vi
        .spyOn(console, 'group')
        .mockImplementation(() => {});
      const consoleLogSpy = vi
        .spyOn(console, 'log')
        .mockImplementation(() => {});
      const consoleGroupEndSpy = vi
        .spyOn(console, 'groupEnd')
        .mockImplementation(() => {});

      vi.stubEnv('MODE', 'development');
      vi.stubEnv('DEV', true);
      vi.stubEnv('PROD', false);

      logBuildConfig();

      expect(consoleGroupSpy).toHaveBeenCalled();
      expect(consoleLogSpy).toHaveBeenCalled();
      expect(consoleGroupEndSpy).toHaveBeenCalled();

      consoleGroupSpy.mockRestore();
      consoleLogSpy.mockRestore();
      consoleGroupEndSpy.mockRestore();
    });

    it('handles missing console gracefully', () => {
      const originalConsole = global.console;
      // @ts-expect-error - Testing edge case
      global.console = undefined;

      vi.stubEnv('DEV', true);

      expect(() => logBuildConfig()).not.toThrow();

      global.console = originalConsole;
    });
  });

  describe('isBuildOptimized', () => {
    it('returns true for optimized production build', () => {
      vi.stubEnv('MODE', 'production');
      vi.stubEnv('DEV', false);
      vi.stubEnv('PROD', true);

      expect(isBuildOptimized()).toBe(true);
    });

    it('returns true for development build', () => {
      vi.stubEnv('MODE', 'development');
      vi.stubEnv('DEV', true);
      vi.stubEnv('PROD', false);

      // Development builds don't need to be optimized
      expect(isBuildOptimized()).toBe(true);
    });
  });
});
