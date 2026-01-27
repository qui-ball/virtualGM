/**
 * Environment Detection and Configuration Utilities
 *
 * Provides utilities to detect the current runtime environment and configure
 * API URLs appropriately for different platforms (browser, iOS simulator, Android emulator, physical devices).
 */

/**
 * Runtime environment types
 */
export type Environment = 'development' | 'production' | 'test';

/**
 * Platform types for mobile development
 */
export type Platform = 'browser' | 'ios' | 'android';

/**
 * Runtime context information
 */
export interface RuntimeContext {
  environment: Environment;
  platform: Platform;
  isMobile: boolean;
  isDevelopment: boolean;
  isProduction: boolean;
  isTest: boolean;
}

/**
 * Detects the current runtime environment
 *
 * @returns The current environment ('development', 'production', or 'test')
 */
export function detectEnvironment(): Environment {
  // In Vite, import.meta.env.MODE is set based on the mode flag
  // 'development' | 'production' | 'test' (when running tests)
  const mode = import.meta.env.MODE;

  // NODE_ENV fallback for non-Vite contexts (e.g., Capacitor config)
  const nodeEnv = import.meta.env.DEV ? 'development' : 'production';

  // Prioritize Vite's MODE, fallback to NODE_ENV detection
  if (mode === 'test' || import.meta.env.VITEST) {
    return 'test';
  }

  if (mode === 'development' || import.meta.env.DEV) {
    return 'development';
  }

  return 'production';
}

/**
 * Detects the current platform (browser, iOS, or Android)
 *
 * @returns The current platform
 */
export function detectPlatform(): Platform {
  // Check if we're running in Capacitor
  if (typeof window !== 'undefined' && (window as any).Capacitor) {
    const capacitor = (window as any).Capacitor;
    const platform = capacitor.getPlatform();

    if (platform === 'ios') {
      return 'ios';
    }
    if (platform === 'android') {
      return 'android';
    }
  }

  // Check for Capacitor platform via user agent (fallback)
  if (typeof navigator !== 'undefined') {
    const userAgent = navigator.userAgent.toLowerCase();
    if (userAgent.includes('iphone') || userAgent.includes('ipad')) {
      return 'ios';
    }
    if (userAgent.includes('android')) {
      return 'android';
    }
  }

  return 'browser';
}

/**
 * Checks if the current platform is mobile (iOS or Android)
 *
 * @returns True if running on mobile platform
 */
export function isMobilePlatform(): boolean {
  const platform = detectPlatform();
  return platform === 'ios' || platform === 'android';
}

/**
 * Gets the complete runtime context
 *
 * @returns Runtime context with environment and platform information
 */
export function getRuntimeContext(): RuntimeContext {
  const environment = detectEnvironment();
  const platform = detectPlatform();

  return {
    environment,
    platform,
    isMobile: isMobilePlatform(),
    isDevelopment: environment === 'development',
    isProduction: environment === 'production',
    isTest: environment === 'test',
  };
}

/**
 * Checks if running in iOS Simulator
 *
 * @returns True if running in iOS Simulator
 */
export function isIOSSimulator(): boolean {
  if (detectPlatform() !== 'ios') {
    return false;
  }

  // iOS Simulator typically has specific user agent patterns
  if (typeof navigator !== 'undefined') {
    const userAgent = navigator.userAgent.toLowerCase();
    return userAgent.includes('simulator') || userAgent.includes('xcode');
  }

  return false;
}

/**
 * Checks if running in Android Emulator
 *
 * @returns True if running in Android Emulator
 */
export function isAndroidEmulator(): boolean {
  if (detectPlatform() !== 'android') {
    return false;
  }

  // Android Emulator typically has specific indicators
  if (typeof navigator !== 'undefined') {
    const userAgent = navigator.userAgent.toLowerCase();
    // Common emulator indicators
    return (
      userAgent.includes('emulator') ||
      userAgent.includes('sdk') ||
      userAgent.includes('genymotion') ||
      userAgent.includes('google_sdk')
    );
  }

  return false;
}

/**
 * Checks if running on a physical device (not simulator/emulator)
 *
 * @returns True if running on a physical device
 */
export function isPhysicalDevice(): boolean {
  if (!isMobilePlatform()) {
    return false;
  }

  return !isIOSSimulator() && !isAndroidEmulator();
}
