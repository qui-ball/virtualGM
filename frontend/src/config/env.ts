/**
 * Environment-aware config for the frontend.
 * Use these values for all backend API calls and environment checks.
 */

const rawApiUrl = import.meta.env.VITE_API_URL;

/** Backend API base URL. Default for local dev: http://localhost:8000 */
export const apiBaseUrl =
  typeof rawApiUrl === 'string' && rawApiUrl.length > 0
    ? rawApiUrl.replace(/\/$/, '')
    : 'http://localhost:8000';

/** True when running in Vite development mode (npm run dev). */
export const isDev = import.meta.env.DEV;

/** True when running in production build. */
export const isProd = import.meta.env.PROD;

export const envConfig = {
  apiBaseUrl,
  isDev,
  isProd,
} as const;
