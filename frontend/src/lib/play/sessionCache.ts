import type { GameStateSnapshot } from '@/types';

const STORAGE_KEY = 'vgm.playSessionCache';

export type SessionCacheEntry = {
  sessionId: string;
  gameState: GameStateSnapshot;
  updatedAt: number;
};

type SessionCacheMap = Record<string, SessionCacheEntry>;

function readMap(): SessionCacheMap {
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY);
    if (!raw) return {};
    return JSON.parse(raw) as SessionCacheMap;
  } catch {
    return {};
  }
}

function writeMap(map: SessionCacheMap): void {
  try {
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify(map));
  } catch {
    // Quota or private mode — resume is best-effort.
  }
}

/** Stable key for lobby resume links (`campaignId` or default bucket). */
export function sessionCacheKey(campaignId?: string | null): string {
  return campaignId?.trim() || '_default';
}

export function getSessionCache(
  campaignId?: string | null,
): SessionCacheEntry | null {
  const key = sessionCacheKey(campaignId);
  return readMap()[key] ?? null;
}

export function storeSessionCache(
  campaignId: string | null | undefined,
  entry: Omit<SessionCacheEntry, 'updatedAt'>,
): void {
  const key = sessionCacheKey(campaignId);
  const map = readMap();
  map[key] = { ...entry, updatedAt: Date.now() };
  writeMap(map);
}

export function clearSessionCache(campaignId?: string | null): void {
  const key = sessionCacheKey(campaignId);
  const map = readMap();
  delete map[key];
  writeMap(map);
}
