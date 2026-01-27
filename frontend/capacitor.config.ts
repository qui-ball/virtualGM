import type { CapacitorConfig } from '@capacitor/cli';
import { config } from 'dotenv';
import { resolve } from 'path';

// Load environment variables from .env files
// Capacitor config is loaded by Node.js, not Vite, so we use process.env
// Priority: .env.development/.env.production > .env
const mode = process.env.NODE_ENV || 'development';
config({ path: resolve(__dirname, `.env.${mode}`) });
config({ path: resolve(__dirname, '.env') });

// Get environment variables
// Note: VITE_ prefix is for Vite build-time variables (used in code)
// For Capacitor config, we read from process.env directly
const devServerUrl = process.env.VITE_CAPACITOR_DEV_SERVER_URL || process.env.CAPACITOR_DEV_SERVER_URL;
const cleartext = (process.env.VITE_CAPACITOR_CLEARTEXT || process.env.CAPACITOR_CLEARTEXT) === 'true';
const appName = process.env.VITE_APP_NAME || process.env.APP_NAME || 'Virtual GM';

const capacitorConfig: CapacitorConfig = {
  appId: 'com.virtualgm.app',
  appName: appName,
  webDir: 'dist',
  // Development server configuration for live reload
  // Only set server URL when VITE_CAPACITOR_DEV_SERVER_URL is provided
  // This enables live reload when testing on physical devices
  // 
  // Note: This configures the frontend dev server URL for live reload.
  // The backend API URL is configured separately via VITE_API_URL environment variable
  // and handled by src/utils/apiConfig.ts, which automatically detects the platform
  // and sets the appropriate API URL (localhost for simulators, 10.0.2.2 for Android emulator, etc.)
  server: devServerUrl
    ? {
        url: devServerUrl,
        cleartext: cleartext, // Required for Android to allow HTTP connections (not HTTPS)
      }
    : undefined, // No server config in production builds
};

export default capacitorConfig;
