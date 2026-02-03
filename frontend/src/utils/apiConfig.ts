/**
 * API Configuration Utilities
 *
 * Provides environment-aware API URL configuration for different platforms
 * and environments (browser, iOS simulator, Android emulator, physical devices).
 */

import {
  detectEnvironment,
  detectPlatform,
  isIOSSimulator,
  isAndroidEmulator,
  isPhysicalDevice,
  getRuntimeContext,
} from './environment';

/**
 * API configuration options
 */
export interface ApiConfig {
  baseUrl: string;
  timeout: number;
  headers: Record<string, string>;
}

/**
 * Validates if a string is a valid URL format
 *
 * @param url The URL string to validate
 * @returns True if the URL is valid, false otherwise
 */
function isValidUrl(url: string): boolean {
  try {
    new URL(url);
    return true;
  } catch {
    return false;
  }
}

/**
 * Gets the appropriate API base URL based on the current environment and platform
 *
 * Priority:
 * 1. VITE_API_URL environment variable (if set and valid)
 * 2. Platform-specific defaults:
 *    - Browser: http://localhost:8000 (development) or production URL
 *    - iOS Simulator: http://localhost:8000 (can access host localhost)
 *    - Android Emulator: http://10.0.2.2:8000 (Android emulator special IP)
 *    - Physical Device: Use host IP from VITE_API_URL or detect from window.location
 *
 * @returns The API base URL
 */
export function getApiBaseUrl(): string {
  const environment = detectEnvironment();
  const platform = detectPlatform();

  // If VITE_API_URL is explicitly set, validate and use it (highest priority)
  const explicitApiUrl = import.meta.env.VITE_API_URL;
  if (explicitApiUrl) {
    if (isValidUrl(explicitApiUrl)) {
      return explicitApiUrl;
    } else {
      // Invalid URL provided - warn in development
      if (
        environment === 'development' &&
        typeof console !== 'undefined' &&
        console.warn
      ) {
        console.warn(
          `⚠️ Invalid VITE_API_URL format: "${explicitApiUrl}". Falling back to platform-specific default.`
        );
      }
      // Fall through to platform-specific defaults
    }
  }

  // Production: use production API URL
  if (environment === 'production') {
    // Default production URL (VITE_API_URL already checked above)
    return 'https://api.virtualgm.com';
  }

  // Development environment
  if (environment === 'development') {
    // Browser: use localhost
    if (platform === 'browser') {
      return 'http://localhost:8000';
    }

    // iOS Simulator: can access host's localhost
    if (platform === 'ios' && isIOSSimulator()) {
      return 'http://localhost:8000';
    }

    // Android Emulator: use special IP 10.0.2.2 to access host's localhost
    if (platform === 'android' && isAndroidEmulator()) {
      return 'http://10.0.2.2:8000';
    }

    // Physical devices: need host IP
    // Try to extract from window.location if available, otherwise use a default
    if (isPhysicalDevice()) {
      // For physical devices, we need the host machine's IP address
      // This should be set via VITE_API_URL environment variable
      // Fallback: try to detect from current page URL (if running via Capacitor dev server)
      if (typeof window !== 'undefined' && window.location) {
        const currentUrl = window.location.origin;
        // If we're accessing via IP (not localhost), use that IP for API
        if (
          !currentUrl.includes('localhost') &&
          !currentUrl.includes('127.0.0.1')
        ) {
          try {
            const url = new URL(currentUrl);
            return `http://${url.hostname}:8000`;
          } catch {
            // Invalid URL, fall back to default
          }
        }
      }

      // Default fallback for physical devices (should be overridden via env var)
      // In development, this will likely fail - warn developers
      if (typeof console !== 'undefined' && console.warn) {
        const detectedUrl = window.location?.origin || 'unknown';
        console.warn(
          `⚠️ Physical device detected but API URL is localhost. ` +
            `Current origin: ${detectedUrl}. ` +
            `Set VITE_API_URL to your machine's IP address (e.g., http://192.168.1.100:8000)`
        );
      }
      return 'http://localhost:8000';
    }
  }

  // Test environment: use mock server or localhost
  return 'http://localhost:8000';
}

/**
 * Gets the complete API configuration
 *
 * @param options Optional configuration overrides
 * @returns Complete API configuration
 */
export function getApiConfig(options?: Partial<ApiConfig>): ApiConfig {
  const baseUrl = getApiBaseUrl();
  const environment = detectEnvironment();

  const defaultConfig: ApiConfig = {
    baseUrl,
    timeout: environment === 'production' ? 30000 : 60000, // Longer timeout in dev
    headers: {
      'Content-Type': 'application/json',
      Accept: 'application/json',
    },
  };

  // Merge with provided options
  return {
    ...defaultConfig,
    ...options,
    headers: {
      ...defaultConfig.headers,
      ...options?.headers,
    },
  };
}

/**
 * Builds a full API URL from a path
 *
 * @param path API path (e.g., '/api/users' or 'users')
 * @returns Full URL
 */
export function buildApiUrl(path: string): string {
  const baseUrl = getApiBaseUrl();
  // Ensure path starts with /
  const normalizedPath = path.startsWith('/') ? path : `/${path}`;
  // Remove trailing slash from baseUrl if present
  const normalizedBaseUrl = baseUrl.replace(/\/$/, '');
  return `${normalizedBaseUrl}${normalizedPath}`;
}

/**
 * Gets connection information for debugging
 *
 * @returns Object with connection details
 */
export function getConnectionInfo() {
  const context = getRuntimeContext();
  const apiUrl = getApiBaseUrl();

  return {
    environment: context.environment,
    platform: context.platform,
    isMobile: context.isMobile,
    isSimulator: isIOSSimulator() || isAndroidEmulator(),
    isPhysicalDevice: isPhysicalDevice(),
    apiBaseUrl: apiUrl,
    explicitApiUrl: import.meta.env.VITE_API_URL || null,
  };
}

/**
 * Logs connection information to console for debugging
 *
 * Useful for development to quickly see current API configuration
 */
export function logConnectionInfo(): void {
  const info = getConnectionInfo();
  if (typeof console !== 'undefined' && console.group) {
    console.group('🔌 API Connection Info');
    console.log('Environment:', info.environment);
    console.log('Platform:', info.platform);
    console.log('API URL:', info.apiBaseUrl);
    console.log('Is Mobile:', info.isMobile);
    console.log('Is Simulator:', info.isSimulator);
    console.log('Is Physical Device:', info.isPhysicalDevice);
    if (info.explicitApiUrl) {
      console.log('Explicit API URL:', info.explicitApiUrl);
    }
    console.groupEnd();
  }
}

/**
 * Tests API connectivity by making a HEAD request to the health endpoint
 *
 * @param healthEndpoint Optional health check endpoint (default: '/health')
 * @returns Promise resolving to true if connection successful, false otherwise
 */
export async function testApiConnection(
  healthEndpoint: string = '/health'
): Promise<boolean> {
  try {
    const url = buildApiUrl(healthEndpoint);
    const response = await fetch(url, {
      method: 'HEAD',
      signal: AbortSignal.timeout(5000), // 5 second timeout
    });
    return response.ok;
  } catch {
    return false;
  }
}
