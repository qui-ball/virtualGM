/**
 * Example component demonstrating environment variable usage
 *
 * This is a reference implementation showing how to use environment variables
 * in React components. Remove or adapt as needed for your application.
 */

import { useEffect, useState } from 'react';
import { getEnvConfig, validateEnvConfig, logEnvConfig } from '@/utils/env';

/**
 * Example component that displays environment configuration
 *
 * This component demonstrates:
 * - Accessing environment variables
 * - Validating configuration
 * - Debug logging
 */
export function EnvExample() {
  const [config] = useState(getEnvConfig());
  const [validation] = useState(validateEnvConfig());

  useEffect(() => {
    // Log environment config in development (automatically disabled in production)
    logEnvConfig();

    const validationResult = validateEnvConfig();
    if (!validationResult.valid) {
      console.error(
        'Environment configuration errors:',
        validationResult.errors
      );
    }

    if (validationResult.warnings.length > 0) {
      console.warn('Environment warnings:', validationResult.warnings);
    }
  }, []);

  return (
    <div className="p-4 border rounded-lg">
      <h2 className="text-xl font-bold mb-4">Environment Configuration</h2>

      <div className="space-y-2">
        <div>
          <strong>App Name:</strong> {config.appName}
        </div>
        <div>
          <strong>Environment:</strong> {config.appEnv}
        </div>
        <div>
          <strong>Mode:</strong> {config.mode}
        </div>
        <div>
          <strong>API URL:</strong> {config.apiUrl || '(not set)'}
        </div>
        {config.capacitorDevServerUrl && (
          <div>
            <strong>Capacitor Dev Server:</strong>{' '}
            {config.capacitorDevServerUrl}
          </div>
        )}
      </div>

      {validation.errors.length > 0 && (
        <div className="mt-4 p-2 bg-red-100 border border-red-400 rounded">
          <strong className="text-red-800">Errors:</strong>
          <ul className="list-disc list-inside mt-1">
            {validation.errors.map((error, index) => (
              <li key={index} className="text-red-700 text-sm">
                {error}
              </li>
            ))}
          </ul>
        </div>
      )}

      {validation.warnings.length > 0 && (
        <div className="mt-4 p-2 bg-yellow-100 border border-yellow-400 rounded">
          <strong className="text-yellow-800">Warnings:</strong>
          <ul className="list-disc list-inside mt-1">
            {validation.warnings.map((warning, index) => (
              <li key={index} className="text-yellow-700 text-sm">
                {warning}
              </li>
            ))}
          </ul>
        </div>
      )}

      {validation.valid && validation.warnings.length === 0 && (
        <div className="mt-4 p-2 bg-green-100 border border-green-400 rounded text-green-800">
          ✓ Environment configuration is valid
        </div>
      )}
    </div>
  );
}
