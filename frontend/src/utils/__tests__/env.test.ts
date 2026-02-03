/**
 * Unit tests for environment variable utilities
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  getApiUrl,
  getCapacitorDevServerUrl,
  getCapacitorCleartext,
  getAppEnv,
  getAppName,
  getEnvConfig,
  validateEnvConfig,
  logEnvConfig,
} from '../env';

describe('env utilities', () => {
  beforeEach(() => {
    vi.resetModules();
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  describe('getApiUrl', () => {
    it('returns VITE_API_URL when set', () => {
      vi.stubEnv('VITE_API_URL', 'http://localhost:8000');
      expect(getApiUrl()).toBe('http://localhost:8000');
    });

    it('returns empty string when not set', () => {
      vi.unstubAllEnvs();
      vi.stubEnv('VITE_API_URL', undefined);
      expect(getApiUrl()).toBe('');
    });
  });

  describe('getCapacitorDevServerUrl', () => {
    it('returns URL when set', () => {
      vi.stubEnv('VITE_CAPACITOR_DEV_SERVER_URL', 'http://192.168.1.100:5173');
      expect(getCapacitorDevServerUrl()).toBe('http://192.168.1.100:5173');
    });

    it('returns undefined when not set', () => {
      vi.unstubAllEnvs();
      vi.stubEnv('VITE_CAPACITOR_DEV_SERVER_URL', undefined);
      expect(getCapacitorDevServerUrl()).toBeUndefined();
    });

    it('returns undefined when empty string', () => {
      vi.stubEnv('VITE_CAPACITOR_DEV_SERVER_URL', '');
      expect(getCapacitorDevServerUrl()).toBeUndefined();
    });

    it('returns undefined when whitespace only', () => {
      vi.stubEnv('VITE_CAPACITOR_DEV_SERVER_URL', '   ');
      expect(getCapacitorDevServerUrl()).toBeUndefined();
    });
  });

  describe('getCapacitorCleartext', () => {
    it('returns true when set to "true"', () => {
      vi.stubEnv('VITE_CAPACITOR_CLEARTEXT', 'true');
      expect(getCapacitorCleartext()).toBe(true);
    });

    it('returns false when set to "false"', () => {
      vi.stubEnv('VITE_CAPACITOR_CLEARTEXT', 'false');
      expect(getCapacitorCleartext()).toBe(false);
    });

    it('returns false when not set', () => {
      vi.unstubAllEnvs();
      vi.stubEnv('VITE_CAPACITOR_CLEARTEXT', undefined);
      expect(getCapacitorCleartext()).toBe(false);
    });
  });

  describe('getAppEnv', () => {
    it('returns development when VITE_APP_ENV is development', () => {
      vi.stubEnv('VITE_APP_ENV', 'development');
      expect(getAppEnv()).toBe('development');
    });

    it('returns staging when VITE_APP_ENV is staging', () => {
      vi.stubEnv('VITE_APP_ENV', 'staging');
      expect(getAppEnv()).toBe('staging');
    });

    it('returns production when VITE_APP_ENV is production', () => {
      vi.stubEnv('VITE_APP_ENV', 'production');
      expect(getAppEnv()).toBe('production');
    });

    it('falls back to MODE when VITE_APP_ENV is not set', () => {
      vi.unstubAllEnvs();
      vi.stubEnv('VITE_APP_ENV', undefined);
      vi.stubEnv('MODE', 'development');
      expect(getAppEnv()).toBe('development');
    });

    it('falls back to production when MODE is production', () => {
      vi.unstubAllEnvs();
      vi.stubEnv('VITE_APP_ENV', undefined);
      vi.stubEnv('MODE', 'production');
      expect(getAppEnv()).toBe('production');
    });

    it('defaults to production for invalid values', () => {
      vi.stubEnv('VITE_APP_ENV', 'invalid');
      vi.stubEnv('MODE', 'production');
      expect(getAppEnv()).toBe('production');
    });
  });

  describe('getAppName', () => {
    it('returns VITE_APP_NAME when set', () => {
      vi.stubEnv('VITE_APP_NAME', 'My App');
      expect(getAppName()).toBe('My App');
    });

    it('returns default when not set', () => {
      vi.unstubAllEnvs();
      vi.stubEnv('VITE_APP_NAME', undefined);
      expect(getAppName()).toBe('Virtual GM');
    });
  });

  describe('getEnvConfig', () => {
    it('returns complete configuration object', () => {
      vi.stubEnv('VITE_API_URL', 'http://localhost:8000');
      vi.stubEnv('VITE_APP_NAME', 'Test App');
      vi.stubEnv('VITE_APP_ENV', 'development');
      vi.stubEnv('MODE', 'development');
      vi.stubEnv('DEV', true);
      vi.stubEnv('PROD', false);

      const config = getEnvConfig();

      expect(config.apiUrl).toBe('http://localhost:8000');
      expect(config.appName).toBe('Test App');
      expect(config.appEnv).toBe('development');
      expect(config.mode).toBe('development');
      expect(config.dev).toBe(true);
      expect(config.prod).toBe(false);
    });
  });

  describe('validateEnvConfig', () => {
    it('returns valid when all required variables are set correctly', () => {
      vi.stubEnv('VITE_API_URL', 'http://localhost:8000');

      const result = validateEnvConfig();

      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('returns error when VITE_API_URL is missing', () => {
      vi.unstubAllEnvs();
      vi.stubEnv('VITE_API_URL', undefined);

      const result = validateEnvConfig();

      expect(result.valid).toBe(false);
      expect(result.errors).toContain('VITE_API_URL is required but not set');
    });

    it('returns error when VITE_API_URL is empty string', () => {
      vi.stubEnv('VITE_API_URL', '');

      const result = validateEnvConfig();

      expect(result.valid).toBe(false);
      expect(result.errors).toContain('VITE_API_URL is required but not set');
    });

    it('returns error when VITE_API_URL is invalid URL', () => {
      vi.stubEnv('VITE_API_URL', 'not-a-valid-url');

      const result = validateEnvConfig();

      expect(result.valid).toBe(false);
      expect(result.errors.some(e => e.includes('not a valid URL'))).toBe(true);
    });

    it('returns warning when dev server URL set but cleartext is false', () => {
      vi.stubEnv('VITE_API_URL', 'http://localhost:8000');
      vi.stubEnv('VITE_CAPACITOR_DEV_SERVER_URL', 'http://192.168.1.100:5173');
      vi.stubEnv('VITE_CAPACITOR_CLEARTEXT', 'false');
      vi.stubEnv('DEV', true);

      const result = validateEnvConfig();

      expect(result.warnings.length).toBeGreaterThan(0);
      expect(result.warnings.some(w => w.includes('CLEARTEXT'))).toBe(true);
    });

    it('returns warning when dev server URL not set in development', () => {
      vi.stubEnv('VITE_API_URL', 'http://localhost:8000');
      vi.stubEnv('VITE_CAPACITOR_DEV_SERVER_URL', undefined);
      vi.stubEnv('VITE_APP_ENV', 'development');
      vi.stubEnv('DEV', true);

      const result = validateEnvConfig();

      expect(result.warnings.length).toBeGreaterThan(0);
      expect(result.warnings.some(w => w.includes('DEV_SERVER_URL'))).toBe(
        true
      );
    });

    it('does not return warnings in production', () => {
      vi.stubEnv('VITE_API_URL', 'http://localhost:8000');
      vi.stubEnv('VITE_CAPACITOR_DEV_SERVER_URL', undefined);
      vi.stubEnv('DEV', false);
      vi.stubEnv('PROD', true);

      const result = validateEnvConfig();

      expect(result.warnings).toHaveLength(0);
    });
  });

  describe('logEnvConfig', () => {
    it('does not log in production', () => {
      const consoleGroupSpy = vi
        .spyOn(console, 'group')
        .mockImplementation(() => {});
      const consoleLogSpy = vi
        .spyOn(console, 'log')
        .mockImplementation(() => {});

      vi.stubEnv('DEV', false);
      vi.stubEnv('PROD', true);

      logEnvConfig();

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

      vi.stubEnv('VITE_API_URL', 'http://localhost:8000');
      vi.stubEnv('VITE_APP_NAME', 'Test App');
      vi.stubEnv('DEV', true);
      vi.stubEnv('PROD', false);

      logEnvConfig();

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

      expect(() => logEnvConfig()).not.toThrow();

      global.console = originalConsole;
    });
  });
});
