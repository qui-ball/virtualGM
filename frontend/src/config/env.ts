/**
 * Environment-aware config for the frontend.
 * Use these values for all backend API calls and environment checks.
 */

const rawApiUrl = import.meta.env.VITE_API_URL;

/**
 * When the page is opened from a phone/LAN host but VITE_API_URL points at
 * localhost, rewrite the API host to match the page hostname so requests leave
 * the device (localhost on a phone is the phone, not the dev machine).
 */
function resolveApiBaseUrl(): string {
  const configured =
    typeof rawApiUrl === 'string' && rawApiUrl.length > 0
      ? rawApiUrl.replace(/\/$/, '')
      : 'http://localhost:8000';

  if (typeof window === 'undefined') return configured;

  try {
    const api = new URL(configured);
    const pageHost = window.location.hostname;
    const apiIsLoopback =
      api.hostname === 'localhost' || api.hostname === '127.0.0.1';
    const pageIsRemote =
      pageHost !== 'localhost' && pageHost !== '127.0.0.1';
    if (apiIsLoopback && pageIsRemote) {
      api.hostname = pageHost;
      return api.origin;
    }
  } catch {
    // keep configured
  }

  return configured;
}

/** Backend API base URL. Default for local dev: http://localhost:8000 */
export const apiBaseUrl = resolveApiBaseUrl();

/** True when running in Vite development mode (npm run dev). */
export const isDev = import.meta.env.DEV;

/** True when running in production build. */
export const isProd = import.meta.env.PROD;

/**
 * When false (default), /campaign and /play are open without sign-in.
 * Set VITE_ENABLE_AUTH=true to require Supabase auth for those routes.
 */
export const enableAuth = import.meta.env.VITE_ENABLE_AUTH === 'true';

export const envConfig = {
  apiBaseUrl,
  isDev,
  isProd,
  enableAuth,
} as const;
