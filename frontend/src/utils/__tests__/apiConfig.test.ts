/**
 * Unit tests for API configuration utilities
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  getApiBaseUrl,
  getApiConfig,
  buildApiUrl,
  getConnectionInfo,
  logConnectionInfo,
  testApiConnection,
  type ApiConfig,
} from '../apiConfig';
import * as environment from '../environment';

describe('apiConfig utilities', () => {
  const originalEnv = import.meta.env;
  const originalWindow = global.window;

  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
  });

  afterEach(() => {
    global.window = originalWindow;
  });

  describe('getApiBaseUrl', () => {
    it('uses VITE_API_URL when explicitly set (highest priority)', () => {
      vi.stubEnv('VITE_API_URL', 'http://custom-api.example.com:9000');
      vi.stubEnv('MODE', 'development');

      vi.spyOn(environment, 'detectEnvironment').mockReturnValue('development');
      vi.spyOn(environment, 'detectPlatform').mockReturnValue('browser');

      expect(getApiBaseUrl()).toBe('http://custom-api.example.com:9000');
    });

    it('returns production URL in production environment', () => {
      vi.unstubAllEnvs();
      vi.stubEnv('VITE_API_URL', undefined);
      vi.stubEnv('MODE', 'production');

      vi.spyOn(environment, 'detectEnvironment').mockReturnValue('production');
      vi.spyOn(environment, 'detectPlatform').mockReturnValue('browser');

      expect(getApiBaseUrl()).toBe('https://api.virtualgm.com');
    });

    it('uses VITE_API_URL in production if set', () => {
      vi.stubEnv('VITE_API_URL', 'https://custom-production-api.com');
      vi.stubEnv('MODE', 'production');

      vi.spyOn(environment, 'detectEnvironment').mockReturnValue('production');
      vi.spyOn(environment, 'detectPlatform').mockReturnValue('browser');

      expect(getApiBaseUrl()).toBe('https://custom-production-api.com');
    });

    it('returns localhost for browser in development', () => {
      vi.unstubAllEnvs();
      vi.stubEnv('VITE_API_URL', undefined);
      vi.stubEnv('MODE', 'development');

      vi.spyOn(environment, 'detectEnvironment').mockReturnValue('development');
      vi.spyOn(environment, 'detectPlatform').mockReturnValue('browser');

      expect(getApiBaseUrl()).toBe('http://localhost:8000');
    });

    it('returns localhost for iOS Simulator in development', () => {
      vi.unstubAllEnvs();
      vi.stubEnv('VITE_API_URL', undefined);
      vi.stubEnv('MODE', 'development');

      vi.spyOn(environment, 'detectEnvironment').mockReturnValue('development');
      vi.spyOn(environment, 'detectPlatform').mockReturnValue('ios');
      vi.spyOn(environment, 'isIOSSimulator').mockReturnValue(true);

      expect(getApiBaseUrl()).toBe('http://localhost:8000');
    });

    it('returns 10.0.2.2 for Android Emulator in development', () => {
      vi.unstubAllEnvs();
      vi.stubEnv('VITE_API_URL', undefined);
      vi.stubEnv('MODE', 'development');

      vi.spyOn(environment, 'detectEnvironment').mockReturnValue('development');
      vi.spyOn(environment, 'detectPlatform').mockReturnValue('android');
      vi.spyOn(environment, 'isAndroidEmulator').mockReturnValue(true);

      expect(getApiBaseUrl()).toBe('http://10.0.2.2:8000');
    });

    it('uses host IP from window.location for physical device', () => {
      vi.unstubAllEnvs();
      vi.stubEnv('VITE_API_URL', undefined);
      vi.stubEnv('MODE', 'development');

      global.window = {
        ...originalWindow,
        location: {
          origin: 'http://192.168.1.100:5173',
          hostname: '192.168.1.100',
        },
      } as any;

      vi.spyOn(environment, 'detectEnvironment').mockReturnValue('development');
      vi.spyOn(environment, 'detectPlatform').mockReturnValue('ios');
      vi.spyOn(environment, 'isIOSSimulator').mockReturnValue(false);
      vi.spyOn(environment, 'isAndroidEmulator').mockReturnValue(false);
      vi.spyOn(environment, 'isPhysicalDevice').mockReturnValue(true);

      expect(getApiBaseUrl()).toBe('http://192.168.1.100:8000');
    });

    it('falls back to localhost for physical device when no IP detected', () => {
      vi.unstubAllEnvs();
      vi.stubEnv('VITE_API_URL', undefined);
      vi.stubEnv('MODE', 'development');

      global.window = {
        ...originalWindow,
        location: {
          origin: 'http://localhost:5173',
          hostname: 'localhost',
        },
      } as any;

      vi.spyOn(environment, 'detectEnvironment').mockReturnValue('development');
      vi.spyOn(environment, 'detectPlatform').mockReturnValue('ios');
      vi.spyOn(environment, 'isIOSSimulator').mockReturnValue(false);
      vi.spyOn(environment, 'isAndroidEmulator').mockReturnValue(false);
      vi.spyOn(environment, 'isPhysicalDevice').mockReturnValue(true);

      expect(getApiBaseUrl()).toBe('http://localhost:8000');
    });

    it('returns localhost for test environment', () => {
      vi.unstubAllEnvs();
      vi.stubEnv('VITE_API_URL', undefined);
      vi.stubEnv('MODE', 'test');

      vi.spyOn(environment, 'detectEnvironment').mockReturnValue('test');
      vi.spyOn(environment, 'detectPlatform').mockReturnValue('browser');

      expect(getApiBaseUrl()).toBe('http://localhost:8000');
    });
  });

  describe('getApiConfig', () => {
    it('returns default configuration', () => {
      vi.unstubAllEnvs();
      vi.stubEnv('VITE_API_URL', 'http://localhost:8000');
      vi.stubEnv('MODE', 'development');

      vi.spyOn(environment, 'detectEnvironment').mockReturnValue('development');
      vi.spyOn(environment, 'detectPlatform').mockReturnValue('browser');

      const config = getApiConfig();

      expect(config.baseUrl).toBe('http://localhost:8000');
      expect(config.timeout).toBe(60000); // Longer timeout in dev
      expect(config.headers).toEqual({
        'Content-Type': 'application/json',
        Accept: 'application/json',
      });
    });

    it('uses shorter timeout in production', () => {
      vi.unstubAllEnvs();
      vi.stubEnv('VITE_API_URL', 'https://api.virtualgm.com');
      vi.stubEnv('MODE', 'production');

      vi.spyOn(environment, 'detectEnvironment').mockReturnValue('production');
      vi.spyOn(environment, 'detectPlatform').mockReturnValue('browser');

      const config = getApiConfig();

      expect(config.timeout).toBe(30000); // Shorter timeout in prod
    });

    it('merges custom options', () => {
      vi.unstubAllEnvs();
      vi.stubEnv('VITE_API_URL', 'http://localhost:8000');
      vi.stubEnv('MODE', 'development');

      vi.spyOn(environment, 'detectEnvironment').mockReturnValue('development');
      vi.spyOn(environment, 'detectPlatform').mockReturnValue('browser');

      const config = getApiConfig({
        timeout: 120000,
        headers: {
          Authorization: 'Bearer token123',
        },
      });

      expect(config.timeout).toBe(120000);
      expect(config.headers).toEqual({
        'Content-Type': 'application/json',
        Accept: 'application/json',
        Authorization: 'Bearer token123',
      });
    });

    it('merges headers without overwriting defaults', () => {
      vi.unstubAllEnvs();
      vi.stubEnv('VITE_API_URL', 'http://localhost:8000');
      vi.stubEnv('MODE', 'development');

      vi.spyOn(environment, 'detectEnvironment').mockReturnValue('development');
      vi.spyOn(environment, 'detectPlatform').mockReturnValue('browser');

      const config = getApiConfig({
        headers: {
          'X-Custom-Header': 'custom-value',
        },
      });

      expect(config.headers['Content-Type']).toBe('application/json');
      expect(config.headers['Accept']).toBe('application/json');
      expect(config.headers['X-Custom-Header']).toBe('custom-value');
    });
  });

  describe('buildApiUrl', () => {
    beforeEach(() => {
      vi.unstubAllEnvs();
      vi.stubEnv('VITE_API_URL', 'http://localhost:8000');
      vi.stubEnv('MODE', 'development');

      vi.spyOn(environment, 'detectEnvironment').mockReturnValue('development');
      vi.spyOn(environment, 'detectPlatform').mockReturnValue('browser');
    });

    it('builds URL with path starting with slash', () => {
      expect(buildApiUrl('/api/users')).toBe('http://localhost:8000/api/users');
    });

    it('builds URL with path not starting with slash', () => {
      expect(buildApiUrl('api/users')).toBe('http://localhost:8000/api/users');
    });

    it('handles base URL with trailing slash', () => {
      vi.stubEnv('VITE_API_URL', 'http://localhost:8000/');

      expect(buildApiUrl('/api/users')).toBe('http://localhost:8000/api/users');
    });

    it('handles empty path', () => {
      expect(buildApiUrl('')).toBe('http://localhost:8000/');
    });
  });

  describe('getConnectionInfo', () => {
    it('returns complete connection information', () => {
      vi.stubEnv('VITE_API_URL', 'http://custom-api:8000');
      vi.stubEnv('MODE', 'development');

      vi.spyOn(environment, 'getRuntimeContext').mockReturnValue({
        environment: 'development',
        platform: 'ios',
        isMobile: true,
        isDevelopment: true,
        isProduction: false,
        isTest: false,
      });
      vi.spyOn(environment, 'isIOSSimulator').mockReturnValue(true);
      vi.spyOn(environment, 'isAndroidEmulator').mockReturnValue(false);
      vi.spyOn(environment, 'isPhysicalDevice').mockReturnValue(false);
      vi.spyOn(environment, 'detectEnvironment').mockReturnValue('development');
      vi.spyOn(environment, 'detectPlatform').mockReturnValue('ios');

      const info = getConnectionInfo();

      expect(info.environment).toBe('development');
      expect(info.platform).toBe('ios');
      expect(info.isMobile).toBe(true);
      expect(info.isSimulator).toBe(true);
      expect(info.isPhysicalDevice).toBe(false);
      expect(info.apiBaseUrl).toBe('http://custom-api:8000');
      expect(info.explicitApiUrl).toBe('http://custom-api:8000');
    });

    it('returns null for explicitApiUrl when not set', () => {
      vi.unstubAllEnvs();
      vi.stubEnv('VITE_API_URL', undefined);
      vi.stubEnv('MODE', 'development');

      vi.spyOn(environment, 'getRuntimeContext').mockReturnValue({
        environment: 'development',
        platform: 'browser',
        isMobile: false,
        isDevelopment: true,
        isProduction: false,
        isTest: false,
      });
      vi.spyOn(environment, 'isIOSSimulator').mockReturnValue(false);
      vi.spyOn(environment, 'isAndroidEmulator').mockReturnValue(false);
      vi.spyOn(environment, 'isPhysicalDevice').mockReturnValue(false);
      vi.spyOn(environment, 'detectEnvironment').mockReturnValue('development');
      vi.spyOn(environment, 'detectPlatform').mockReturnValue('browser');

      const info = getConnectionInfo();

      expect(info.explicitApiUrl).toBeNull();
    });
  });

  describe('logConnectionInfo', () => {
    it('logs connection information without throwing', () => {
      const consoleSpy = vi.spyOn(console, 'group').mockImplementation(() => {});
      const consoleLogSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
      const consoleGroupEndSpy = vi.spyOn(console, 'groupEnd').mockImplementation(() => {});

      logConnectionInfo();

      expect(consoleSpy).toHaveBeenCalledWith('🔌 API Connection Info');
      expect(consoleLogSpy).toHaveBeenCalled();
      expect(consoleGroupEndSpy).toHaveBeenCalled();

      consoleSpy.mockRestore();
      consoleLogSpy.mockRestore();
      consoleGroupEndSpy.mockRestore();
    });

    it('handles missing console gracefully', () => {
      const originalConsole = global.console;
      // @ts-expect-error - Testing edge case
      global.console = undefined;

      expect(() => logConnectionInfo()).not.toThrow();

      global.console = originalConsole;
    });
  });

  describe('testApiConnection', () => {
    beforeEach(() => {
      vi.unstubAllEnvs();
      vi.stubEnv('VITE_API_URL', 'http://localhost:8000');
      vi.stubEnv('MODE', 'development');
      vi.spyOn(environment, 'detectEnvironment').mockReturnValue('development');
      vi.spyOn(environment, 'detectPlatform').mockReturnValue('browser');
    });

    it('returns true for successful connection', async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
      });

      const result = await testApiConnection('/health');
      expect(result).toBe(true);
      expect(global.fetch).toHaveBeenCalledWith(
        'http://localhost:8000/health',
        expect.objectContaining({
          method: 'HEAD',
        })
      );
    });

    it('returns false for failed connection', async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: false,
        status: 404,
      });

      const result = await testApiConnection('/health');
      expect(result).toBe(false);
    });

    it('returns false on network error', async () => {
      global.fetch = vi.fn().mockRejectedValue(new Error('Network error'));

      const result = await testApiConnection('/health');
      expect(result).toBe(false);
    });

    it('uses custom health endpoint', async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
      });

      await testApiConnection('/api/health');
      expect(global.fetch).toHaveBeenCalledWith(
        'http://localhost:8000/api/health',
        expect.any(Object)
      );
    });
  });
});
