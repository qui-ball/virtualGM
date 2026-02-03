/**
 * Integration tests for environment variable access
 *
 * These tests verify that environment variables are accessible in code
 * as they would be in the actual application.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  getEnvConfig,
  validateEnvConfig,
  getApiUrl,
  getAppName,
  getAppEnv,
} from '../env';

describe('environment variable integration', () => {
  beforeEach(() => {
    vi.resetModules();
  });

  it('can access environment variables via import.meta.env', () => {
    // This test verifies that Vite's environment variable system works
    vi.stubEnv('VITE_API_URL', 'http://test-api.example.com');
    vi.stubEnv('VITE_APP_NAME', 'Test App');

    // Access via our utility
    expect(getApiUrl()).toBe('http://test-api.example.com');
    expect(getAppName()).toBe('Test App');

    // Access directly via import.meta.env (how Vite exposes them)
    expect(import.meta.env.VITE_API_URL).toBe('http://test-api.example.com');
    expect(import.meta.env.VITE_APP_NAME).toBe('Test App');
  });

  it('environment variables are accessible in different environments', () => {
    // Test development mode
    vi.stubEnv('MODE', 'development');
    vi.stubEnv('DEV', true);
    vi.stubEnv('PROD', false);
    vi.stubEnv('VITE_API_URL', 'http://localhost:8000');

    const config = getEnvConfig();
    expect(config.mode).toBe('development');
    expect(config.dev).toBe(true);
    expect(config.prod).toBe(false);

    // Test production mode
    vi.stubEnv('MODE', 'production');
    vi.stubEnv('DEV', false);
    vi.stubEnv('PROD', true);
    vi.stubEnv('VITE_API_URL', 'https://api.virtualgm.com');

    const prodConfig = getEnvConfig();
    expect(prodConfig.mode).toBe('production');
    expect(prodConfig.dev).toBe(false);
    expect(prodConfig.prod).toBe(true);
  });

  it('validates environment configuration correctly', () => {
    vi.stubEnv('VITE_API_URL', 'http://localhost:8000');

    const validation = validateEnvConfig();

    expect(validation.valid).toBe(true);
    expect(validation.errors).toHaveLength(0);
  });

  it('handles missing environment variables gracefully', () => {
    vi.unstubAllEnvs();
    vi.stubEnv('VITE_API_URL', undefined);

    // Should not throw, but validation should fail
    const config = getEnvConfig();
    expect(config.apiUrl).toBe('');

    const validation = validateEnvConfig();
    expect(validation.valid).toBe(false);
    expect(validation.errors.length).toBeGreaterThan(0);
  });

  it('app environment detection works correctly', () => {
    // Test explicit VITE_APP_ENV
    vi.stubEnv('VITE_APP_ENV', 'staging');
    expect(getAppEnv()).toBe('staging');

    // Test fallback to MODE
    vi.stubEnv('VITE_APP_ENV', undefined);
    vi.stubEnv('MODE', 'development');
    expect(getAppEnv()).toBe('development');
  });
});
