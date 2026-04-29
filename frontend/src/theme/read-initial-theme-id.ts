import { THEME_STORAGE_KEY } from './constants';
import { normalizeThemeId } from './normalize-theme-id';
import type { ThemeId } from './theme-ids';

export type StorageLike = Pick<Storage, 'getItem'>;

export type ReadInitialThemeIdOptions = {
  /** Defaults to `globalThis.document` when defined. */
  document?: Document | null;
  /** Defaults to `localStorage` when available. */
  storage?: StorageLike | null;
};

/**
 * Prefer `data-theme` on `<html>` (set by FOWT), then localStorage.
 */
export function readInitialThemeId(options?: ReadInitialThemeIdOptions): ThemeId {
  const doc = options?.document ?? (typeof document !== 'undefined' ? document : null);
  const fromDom = doc?.documentElement?.getAttribute('data-theme') ?? null;

  let fromStorage: string | null = null;
  const s =
    options?.storage ??
    (typeof localStorage !== 'undefined' ? localStorage : null);
  try {
    fromStorage = s?.getItem(THEME_STORAGE_KEY) ?? null;
  } catch {
    fromStorage = null;
  }

  if (fromDom?.trim()) {
    return normalizeThemeId(fromDom);
  }
  return normalizeThemeId(fromStorage ?? undefined);
}
