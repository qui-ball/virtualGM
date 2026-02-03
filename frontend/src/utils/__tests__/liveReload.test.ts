/**
 * Unit tests for live reload utilities
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  getLiveReloadStatus,
  validateLiveReloadConfig,
  logLiveReloadStatus,
  getLiveReloadSetupInstructions,
} from '../liveReload';
import * as env from '../env';
import * as environment from '../environment';

describe('liveReload utilities', () => {
  beforeEach(() => {
    vi.resetModules();
  });

  afterEach(() => {
    vi.unstubAllEnvs();
    vi.clearAllMocks();
  });

  describe('getLiveReloadStatus', () => {
    it('returns disabled status when dev server URL is not set', () => {
      vi.spyOn(env, 'getCapacitorDevServerUrl').mockReturnValue(undefined);
      vi.spyOn(env, 'getCapacitorCleartext').mockReturnValue(false);
      vi.spyOn(environment, 'detectPlatform').mockReturnValue('browser');
      vi.spyOn(environment, 'isMobilePlatform').mockReturnValue(false);
      vi.spyOn(env, 'getEnvConfig').mockReturnValue({
        apiUrl: '',
        capacitorDevServerUrl: undefined,
        capacitorCleartext: false,
        appEnv: 'development',
        appName: 'Test',
        mode: 'development',
        dev: true,
        prod: false,
      });

      const status = getLiveReloadStatus();

      expect(status.enabled).toBe(false);
      expect(status.devServerUrl).toBeNull();
      expect(status.errors).toHaveLength(0);
    });

    it('returns enabled status when dev server URL is set', () => {
      vi.spyOn(env, 'getCapacitorDevServerUrl').mockReturnValue(
        'http://192.168.1.100:5173'
      );
      vi.spyOn(env, 'getCapacitorCleartext').mockReturnValue(true);
      vi.spyOn(environment, 'detectPlatform').mockReturnValue('ios');
      vi.spyOn(environment, 'isMobilePlatform').mockReturnValue(true);
      vi.spyOn(env, 'getEnvConfig').mockReturnValue({
        apiUrl: '',
        capacitorDevServerUrl: 'http://192.168.1.100:5173',
        capacitorCleartext: true,
        appEnv: 'development',
        appName: 'Test',
        mode: 'development',
        dev: true,
        prod: false,
      });

      const status = getLiveReloadStatus();

      expect(status.enabled).toBe(true);
      expect(status.devServerUrl).toBe('http://192.168.1.100:5173');
      expect(status.canConnect).toBe(true);
    });

    it('warns when Android uses HTTP without cleartext', () => {
      vi.spyOn(env, 'getCapacitorDevServerUrl').mockReturnValue(
        'http://192.168.1.100:5173'
      );
      vi.spyOn(env, 'getCapacitorCleartext').mockReturnValue(false);
      vi.spyOn(environment, 'detectPlatform').mockReturnValue('android');
      vi.spyOn(environment, 'isMobilePlatform').mockReturnValue(true);
      vi.spyOn(env, 'getEnvConfig').mockReturnValue({
        apiUrl: '',
        capacitorDevServerUrl: 'http://192.168.1.100:5173',
        capacitorCleartext: false,
        appEnv: 'development',
        appName: 'Test',
        mode: 'development',
        dev: true,
        prod: false,
      });

      const status = getLiveReloadStatus();

      expect(status.warnings.length).toBeGreaterThan(0);
      expect(status.warnings.some(w => w.includes('CLEARTEXT'))).toBe(true);
    });

    it('warns when using localhost on mobile', () => {
      vi.spyOn(env, 'getCapacitorDevServerUrl').mockReturnValue(
        'http://localhost:5173'
      );
      vi.spyOn(env, 'getCapacitorCleartext').mockReturnValue(true);
      vi.spyOn(environment, 'detectPlatform').mockReturnValue('ios');
      vi.spyOn(environment, 'isMobilePlatform').mockReturnValue(true);
      vi.spyOn(env, 'getEnvConfig').mockReturnValue({
        apiUrl: '',
        capacitorDevServerUrl: 'http://localhost:5173',
        capacitorCleartext: true,
        appEnv: 'development',
        appName: 'Test',
        mode: 'development',
        dev: true,
        prod: false,
      });

      const status = getLiveReloadStatus();

      expect(status.warnings.length).toBeGreaterThan(0);
      expect(status.warnings.some(w => w.includes('localhost'))).toBe(true);
    });

    it('errors on invalid URL format', () => {
      vi.spyOn(env, 'getCapacitorDevServerUrl').mockReturnValue(
        'not-a-valid-url'
      );
      vi.spyOn(env, 'getCapacitorCleartext').mockReturnValue(false);
      vi.spyOn(environment, 'detectPlatform').mockReturnValue('browser');
      vi.spyOn(environment, 'isMobilePlatform').mockReturnValue(false);
      vi.spyOn(env, 'getEnvConfig').mockReturnValue({
        apiUrl: '',
        capacitorDevServerUrl: 'not-a-valid-url',
        capacitorCleartext: false,
        appEnv: 'development',
        appName: 'Test',
        mode: 'development',
        dev: true,
        prod: false,
      });

      const status = getLiveReloadStatus();

      expect(status.errors.length).toBeGreaterThan(0);
      expect(status.errors.some(e => e.includes('Invalid'))).toBe(true);
    });
  });

  describe('validateLiveReloadConfig', () => {
    it('returns valid when configuration is correct', () => {
      vi.spyOn(env, 'getCapacitorDevServerUrl').mockReturnValue(
        'http://192.168.1.100:5173'
      );
      vi.spyOn(env, 'getCapacitorCleartext').mockReturnValue(true);
      vi.spyOn(environment, 'detectPlatform').mockReturnValue('ios');
      vi.spyOn(environment, 'isMobilePlatform').mockReturnValue(true);
      vi.spyOn(env, 'getEnvConfig').mockReturnValue({
        apiUrl: '',
        capacitorDevServerUrl: 'http://192.168.1.100:5173',
        capacitorCleartext: true,
        appEnv: 'development',
        appName: 'Test',
        mode: 'development',
        dev: true,
        prod: false,
      });

      const validation = validateLiveReloadConfig();

      expect(validation.valid).toBe(true);
      expect(validation.errors).toHaveLength(0);
    });

    it('returns invalid when there are errors', () => {
      vi.spyOn(env, 'getCapacitorDevServerUrl').mockReturnValue('invalid-url');
      vi.spyOn(env, 'getCapacitorCleartext').mockReturnValue(false);
      vi.spyOn(environment, 'detectPlatform').mockReturnValue('browser');
      vi.spyOn(environment, 'isMobilePlatform').mockReturnValue(false);
      vi.spyOn(env, 'getEnvConfig').mockReturnValue({
        apiUrl: '',
        capacitorDevServerUrl: 'invalid-url',
        capacitorCleartext: false,
        appEnv: 'development',
        appName: 'Test',
        mode: 'development',
        dev: true,
        prod: false,
      });

      const validation = validateLiveReloadConfig();

      expect(validation.valid).toBe(false);
      expect(validation.errors.length).toBeGreaterThan(0);
    });
  });

  describe('logLiveReloadStatus', () => {
    it('does not log in production', () => {
      const consoleGroupSpy = vi
        .spyOn(console, 'group')
        .mockImplementation(() => {});
      const consoleLogSpy = vi
        .spyOn(console, 'log')
        .mockImplementation(() => {});

      vi.stubEnv('DEV', false);
      vi.stubEnv('PROD', true);

      logLiveReloadStatus();

      expect(consoleGroupSpy).not.toHaveBeenCalled();
      expect(consoleLogSpy).not.toHaveBeenCalled();

      consoleGroupSpy.mockRestore();
      consoleLogSpy.mockRestore();
    });

    it('logs status in development', () => {
      const consoleGroupSpy = vi
        .spyOn(console, 'group')
        .mockImplementation(() => {});
      const consoleLogSpy = vi
        .spyOn(console, 'log')
        .mockImplementation(() => {});
      const consoleGroupEndSpy = vi
        .spyOn(console, 'groupEnd')
        .mockImplementation(() => {});

      vi.stubEnv('DEV', true);
      vi.stubEnv('PROD', false);

      logLiveReloadStatus();

      expect(consoleGroupSpy).toHaveBeenCalled();
      expect(consoleLogSpy).toHaveBeenCalled();
      expect(consoleGroupEndSpy).toHaveBeenCalled();

      consoleGroupSpy.mockRestore();
      consoleLogSpy.mockRestore();
      consoleGroupEndSpy.mockRestore();
    });
  });

  describe('getLiveReloadSetupInstructions', () => {
    it('returns browser instructions for browser platform', () => {
      vi.spyOn(environment, 'detectPlatform').mockReturnValue('browser');
      vi.spyOn(environment, 'isMobilePlatform').mockReturnValue(false);

      const instructions = getLiveReloadSetupInstructions();

      expect(instructions.length).toBeGreaterThan(0);
      expect(instructions.some(i => i.includes('browser'))).toBe(true);
    });

    it('returns mobile instructions for iOS platform', () => {
      vi.spyOn(environment, 'detectPlatform').mockReturnValue('ios');
      vi.spyOn(environment, 'isMobilePlatform').mockReturnValue(true);

      const instructions = getLiveReloadSetupInstructions();

      expect(instructions.length).toBeGreaterThan(0);
      expect(instructions.some(i => i.includes('IP address'))).toBe(true);
      expect(
        instructions.some(i => i.includes('VITE_CAPACITOR_DEV_SERVER_URL'))
      ).toBe(true);
    });

    it('returns mobile instructions for Android platform', () => {
      vi.spyOn(environment, 'detectPlatform').mockReturnValue('android');
      vi.spyOn(environment, 'isMobilePlatform').mockReturnValue(true);

      const instructions = getLiveReloadSetupInstructions();

      expect(instructions.length).toBeGreaterThan(0);
      expect(instructions.some(i => i.includes('CLEARTEXT'))).toBe(true);
    });
  });
});
