/**
 * Environment Variable Utilities
 *
 * Provides type-safe access to environment variables with validation and defaults.
 * All environment variables must be prefixed with VITE_ to be accessible in the browser.
 */

/**
 * Environment variable configuration schema
 */
export interface EnvConfig {
  // API Configuration
  apiUrl: string;

  // Capacitor Configuration
  capacitorDevServerUrl: string | undefined;
  capacitorCleartext: boolean;

  // Application Configuration
  appEnv: 'development' | 'staging' | 'production';
  appName: string;

  // Vite Configuration (for reference)
  mode: string;
  dev: boolean;
  prod: boolean;
}

/**
 * Gets the API URL from environment variables
 *
 * @returns API URL string
 */
export function getApiUrl(): string {
  return import.meta.env.VITE_API_URL || '';
}

/**
 * Gets the Capacitor dev server URL from environment variables
 *
 * @returns Dev server URL or undefined if not set
 */
export function getCapacitorDevServerUrl(): string | undefined {
  const url = import.meta.env.VITE_CAPACITOR_DEV_SERVER_URL;
  return url && url.trim() !== '' ? url : undefined;
}

/**
 * Gets whether Capacitor cleartext (HTTP) is enabled
 *
 * @returns True if cleartext is enabled
 */
export function getCapacitorCleartext(): boolean {
  const value = import.meta.env.VITE_CAPACITOR_CLEARTEXT;
  return value === 'true' || value === true;
}

/**
 * Gets the application environment
 *
 * @returns Application environment ('development', 'staging', or 'production')
 */
export function getAppEnv(): 'development' | 'staging' | 'production' {
  const env = import.meta.env.VITE_APP_ENV;
  if (env === 'development' || env === 'staging' || env === 'production') {
    return env;
  }
  // Fallback to Vite's mode if VITE_APP_ENV is not set
  return import.meta.env.MODE === 'development' ? 'development' : 'production';
}

/**
 * Gets the application name
 *
 * @returns Application name string
 */
export function getAppName(): string {
  return import.meta.env.VITE_APP_NAME || 'Virtual GM';
}

/**
 * Gets all environment configuration in a type-safe object
 *
 * @returns Complete environment configuration
 */
export function getEnvConfig(): EnvConfig {
  return {
    apiUrl: getApiUrl(),
    capacitorDevServerUrl: getCapacitorDevServerUrl(),
    capacitorCleartext: getCapacitorCleartext(),
    appEnv: getAppEnv(),
    appName: getAppName(),
    mode: import.meta.env.MODE,
    dev: import.meta.env.DEV,
    prod: import.meta.env.PROD,
  };
}

/**
 * Validates that required environment variables are set
 *
 * @returns Object with validation results
 */
export function validateEnvConfig(): {
  valid: boolean;
  errors: string[];
  warnings: string[];
} {
  const errors: string[] = [];
  const warnings: string[] = [];

  const config = getEnvConfig();

  // Required variables
  if (!config.apiUrl || config.apiUrl.trim() === '') {
    errors.push('VITE_API_URL is required but not set');
  } else {
    // Validate URL format
    try {
      new URL(config.apiUrl);
    } catch {
      errors.push(`VITE_API_URL is not a valid URL: "${config.apiUrl}"`);
    }
  }

  // Warnings for development
  if (config.dev) {
    if (config.capacitorDevServerUrl && !config.capacitorCleartext) {
      warnings.push(
        'VITE_CAPACITOR_DEV_SERVER_URL is set but VITE_CAPACITOR_CLEARTEXT is false. ' +
          'Android may not be able to connect via HTTP.'
      );
    }

    if (!config.capacitorDevServerUrl && config.appEnv === 'development') {
      warnings.push(
        'VITE_CAPACITOR_DEV_SERVER_URL is not set. ' +
          'Live reload will not work on physical devices.'
      );
    }
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings,
  };
}

/**
 * Logs environment configuration to console (for debugging)
 *
 * Only logs in development mode to avoid exposing sensitive data in production
 */
export function logEnvConfig(): void {
  if (!import.meta.env.DEV) {
    return; // Don't log in production
  }

  const config = getEnvConfig();
  const validation = validateEnvConfig();

  if (typeof console !== 'undefined' && console.group) {
    console.group('🔧 Environment Configuration');
    console.log('Mode:', config.mode);
    console.log('App Environment:', config.appEnv);
    console.log('App Name:', config.appName);
    console.log('API URL:', config.apiUrl);
    if (config.capacitorDevServerUrl) {
      console.log('Capacitor Dev Server:', config.capacitorDevServerUrl);
      console.log('Capacitor Cleartext:', config.capacitorCleartext);
    }

    if (validation.errors.length > 0) {
      console.group('❌ Errors');
      validation.errors.forEach(error => console.error(error));
      console.groupEnd();
    }

    if (validation.warnings.length > 0) {
      console.group('⚠️ Warnings');
      validation.warnings.forEach(warning => console.warn(warning));
      console.groupEnd();
    }

    console.groupEnd();
  }
}
