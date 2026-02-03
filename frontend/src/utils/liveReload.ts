/**
 * Live Reload Utilities
 *
 * Provides utilities to help set up and verify Capacitor live reload
 * for mobile development.
 */

import {
  getCapacitorDevServerUrl,
  getCapacitorCleartext,
  getEnvConfig,
} from './env';
import { detectPlatform, isMobilePlatform } from './environment';

/**
 * Live reload configuration status
 */
export interface LiveReloadStatus {
  enabled: boolean;
  devServerUrl: string | null;
  cleartext: boolean;
  platform: string;
  isMobile: boolean;
  canConnect: boolean;
  warnings: string[];
  errors: string[];
}

/**
 * Gets the current live reload configuration status
 *
 * @returns Live reload status information
 */
export function getLiveReloadStatus(): LiveReloadStatus {
  const devServerUrl = getCapacitorDevServerUrl();
  const cleartext = getCapacitorCleartext();
  const platform = detectPlatform();
  const isMobile = isMobilePlatform();
  const config = getEnvConfig();

  const warnings: string[] = [];
  const errors: string[] = [];
  let canConnect = false;

  // Check if live reload is enabled
  const enabled = !!devServerUrl;

  if (enabled) {
    // Validate URL
    try {
      const url = new URL(devServerUrl);
      canConnect = url.protocol === 'http:' || url.protocol === 'https:';

      if (!canConnect) {
        errors.push(`Invalid dev server URL protocol: ${url.protocol}`);
      }
    } catch {
      errors.push(`Invalid dev server URL format: ${devServerUrl}`);
    }

    // Platform-specific checks
    if (isMobile) {
      if (
        platform === 'android' &&
        !cleartext &&
        devServerUrl.startsWith('http://')
      ) {
        warnings.push(
          'Android requires VITE_CAPACITOR_CLEARTEXT=true for HTTP connections. ' +
            'Set it to true in your .env file.'
        );
      }

      // Check if URL is accessible from mobile
      if (devServerUrl.includes('localhost') && isMobile) {
        warnings.push(
          'Using localhost may not work on physical devices. ' +
            "Consider using your machine's IP address (e.g., http://192.168.1.100:5173)"
        );
      }
    }

    // Development mode check
    if (config.mode === 'production') {
      warnings.push(
        'Live reload is configured but build mode is production. ' +
          'Live reload only works in development mode.'
      );
    }
  } else {
    if (isMobile && config.dev) {
      warnings.push(
        'Live reload is not configured. ' +
          'Set VITE_CAPACITOR_DEV_SERVER_URL to enable live reload on mobile devices.'
      );
    }
  }

  return {
    enabled,
    devServerUrl: devServerUrl || null,
    cleartext,
    platform,
    isMobile,
    canConnect: canConnect && enabled,
    warnings,
    errors,
  };
}

/**
 * Validates live reload configuration
 *
 * @returns Validation result
 */
export function validateLiveReloadConfig(): {
  valid: boolean;
  errors: string[];
  warnings: string[];
} {
  const status = getLiveReloadStatus();

  return {
    valid: status.errors.length === 0,
    errors: status.errors,
    warnings: status.warnings,
  };
}

/**
 * Logs live reload status to console (for debugging)
 *
 * Only logs in development mode
 */
export function logLiveReloadStatus(): void {
  if (!import.meta.env.DEV) {
    return; // Don't log in production
  }

  const status = getLiveReloadStatus();

  if (typeof console !== 'undefined' && console.group) {
    console.group('🔄 Live Reload Status');
    console.log('Enabled:', status.enabled);
    console.log('Platform:', status.platform);
    console.log('Is Mobile:', status.isMobile);

    if (status.devServerUrl) {
      console.log('Dev Server URL:', status.devServerUrl);
      console.log('Cleartext:', status.cleartext);
      console.log('Can Connect:', status.canConnect);
    }

    if (status.errors.length > 0) {
      console.group('❌ Errors');
      status.errors.forEach(error => console.error(error));
      console.groupEnd();
    }

    if (status.warnings.length > 0) {
      console.group('⚠️ Warnings');
      status.warnings.forEach(warning => console.warn(warning));
      console.groupEnd();
    }

    if (status.enabled && status.errors.length === 0) {
      console.log('✅ Live reload is properly configured');
    } else if (!status.enabled) {
      console.log(
        'ℹ️  Live reload is not configured (optional for browser development)'
      );
    }

    console.groupEnd();
  }
}

/**
 * Gets instructions for setting up live reload
 *
 * @returns Setup instructions based on current platform
 */
export function getLiveReloadSetupInstructions(): string[] {
  const platform = detectPlatform();
  const isMobile = isMobilePlatform();
  const instructions: string[] = [];

  if (!isMobile) {
    instructions.push(
      'Live reload is automatically enabled in the browser via Vite HMR.',
      'No additional configuration needed for browser development.'
    );
    return instructions;
  }

  instructions.push('To enable live reload on mobile devices:');
  instructions.push('');
  instructions.push("1. Find your machine's IP address:");

  if (platform === 'ios') {
    instructions.push(
      '   - macOS: Run `ipconfig getifaddr en0` or check System Preferences'
    );
    instructions.push("   - Linux: Run `hostname -I | awk '{print $1}'`");
  } else {
    instructions.push(
      '   - macOS/Linux: Run `ifconfig | grep "inet " | grep -v 127.0.0.1`'
    );
    instructions.push('   - Windows: Run `ipconfig` and look for IPv4 Address');
  }

  instructions.push('');
  instructions.push('2. Set environment variables in frontend/.env.local:');
  instructions.push('   VITE_CAPACITOR_DEV_SERVER_URL=http://YOUR_IP:5173');

  if (platform === 'android') {
    instructions.push('   VITE_CAPACITOR_CLEARTEXT=true');
  }

  instructions.push('');
  instructions.push('3. Rebuild and sync:');
  instructions.push('   npm run build:dev');
  instructions.push('   npm run cap:sync:dev');
  instructions.push('');
  instructions.push('4. Start the dev server:');
  instructions.push('   npm run dev');
  instructions.push('');
  instructions.push(
    '5. Run the app on your device - changes will reload automatically!'
  );

  return instructions;
}
