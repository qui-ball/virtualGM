/**
 * Build Configuration Utilities
 *
 * Provides utilities to check build configuration and verify
 * that development and production builds are properly configured.
 */

/**
 * Build configuration information
 */
export interface BuildConfig {
  mode: string;
  isDevelopment: boolean;
  isProduction: boolean;
  hasSourceMaps: boolean;
  isMinified: boolean;
  target: string;
}

/**
 * Gets the current build configuration
 *
 * @returns Build configuration object
 */
export function getBuildConfig(): BuildConfig {
  const mode = import.meta.env.MODE;
  const isDevelopment = mode === 'development' || import.meta.env.DEV;
  const isProduction = mode === 'production' || import.meta.env.PROD;

  // In development, source maps are enabled
  // In production, source maps are disabled
  const hasSourceMaps = isDevelopment;

  // In development, minification is disabled
  // In production, minification is enabled
  const isMinified = isProduction;

  return {
    mode,
    isDevelopment,
    isProduction,
    hasSourceMaps,
    isMinified,
    target: 'esnext', // Modern browsers
  };
}

/**
 * Validates build configuration
 *
 * @returns Validation result with warnings/errors
 */
export function validateBuildConfig(): {
  valid: boolean;
  warnings: string[];
  errors: string[];
} {
  const config = getBuildConfig();
  const warnings: string[] = [];
  const errors: string[] = [];

  // Production build checks
  if (config.isProduction) {
    if (config.hasSourceMaps) {
      warnings.push(
        'Source maps are enabled in production. This increases bundle size and may expose source code.'
      );
    }

    if (!config.isMinified) {
      errors.push(
        'Production builds must be minified for optimal performance.'
      );
    }
  }

  // Development build checks
  if (config.isDevelopment) {
    if (!config.hasSourceMaps) {
      warnings.push(
        'Source maps are disabled in development. This may make debugging more difficult.'
      );
    }

    if (config.isMinified) {
      warnings.push(
        'Minification is enabled in development. This may slow down builds and make debugging harder.'
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
 * Logs build configuration to console (for debugging)
 *
 * Only logs in development mode
 */
export function logBuildConfig(): void {
  if (!import.meta.env.DEV) {
    return; // Don't log in production
  }

  const config = getBuildConfig();
  const validation = validateBuildConfig();

  if (typeof console !== 'undefined' && console.group) {
    console.group('🔧 Build Configuration');
    console.log('Mode:', config.mode);
    console.log(
      'Environment:',
      config.isDevelopment ? 'Development' : 'Production'
    );
    console.log('Source Maps:', config.hasSourceMaps ? 'Enabled' : 'Disabled');
    console.log('Minification:', config.isMinified ? 'Enabled' : 'Disabled');
    console.log('Target:', config.target);

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

    if (validation.valid && validation.warnings.length === 0) {
      console.log('✅ Build configuration is valid');
    }

    console.groupEnd();
  }
}

/**
 * Checks if the build is optimized for production
 *
 * @returns True if build is optimized
 */
export function isBuildOptimized(): boolean {
  const config = getBuildConfig();
  const validation = validateBuildConfig();

  if (!config.isProduction) {
    return true; // Development builds don't need to be optimized
  }

  return validation.valid && config.isMinified && !config.hasSourceMaps;
}
