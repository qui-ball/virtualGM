/**
 * Soft-account selection (Feature 07) — display name only, no credentials.
 */

const ACCOUNT_ID_KEY = 'virtualgm.accountId';
const ACCOUNT_NAME_KEY = 'virtualgm.accountDisplayName';

export type SoftAccount = {
  id: string;
  displayName: string;
};

export function readStoredAccount(): SoftAccount | null {
  if (typeof window === 'undefined') return null;
  const id = window.localStorage.getItem(ACCOUNT_ID_KEY)?.trim();
  if (!id) return null;
  const displayName =
    window.localStorage.getItem(ACCOUNT_NAME_KEY)?.trim() || 'Player';
  return { id, displayName };
}

export function writeStoredAccount(account: SoftAccount): void {
  if (typeof window === 'undefined') return;
  window.localStorage.setItem(ACCOUNT_ID_KEY, account.id);
  window.localStorage.setItem(ACCOUNT_NAME_KEY, account.displayName);
}

export function clearStoredAccount(): void {
  if (typeof window === 'undefined') return;
  window.localStorage.removeItem(ACCOUNT_ID_KEY);
  window.localStorage.removeItem(ACCOUNT_NAME_KEY);
}

export { ACCOUNT_ID_KEY, ACCOUNT_NAME_KEY };
