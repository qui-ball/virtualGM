import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createSession, getHealth } from '@/api/client';

vi.mock('@/config', () => ({
  apiBaseUrl: 'http://test.api',
}));

describe('api client', () => {
  beforeEach(() => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ status: 'ok', supabase_configured: true }),
      }),
    );
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.clearAllMocks();
  });

  it('getHealth calls GET /health', async () => {
    const res = await getHealth();
    expect(fetch).toHaveBeenCalledWith('http://test.api/health', {
      headers: { 'Content-Type': 'application/json' },
    });
    expect(res.status).toBe('ok');
  });

  it('createSession POSTs without body by default', async () => {
    vi.mocked(fetch).mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        session_id: 'sess1',
        character_name: 'Aldric',
        game_state: { character: null, enemies: {}, countdowns: {}, in_combat: false },
      }),
    } as Response);

    const res = await createSession();
    expect(fetch).toHaveBeenCalledWith('http://test.api/sessions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: undefined,
    });
    expect(res.session_id).toBe('sess1');
  });

  it('createSession POSTs character_name when provided', async () => {
    vi.mocked(fetch).mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        session_id: 'sess2',
        character_name: 'Zaelan',
        game_state: { character: null, enemies: {}, countdowns: {}, in_combat: false },
      }),
    } as Response);

    await createSession({ character_name: 'Zaelan' });
    expect(fetch).toHaveBeenCalledWith('http://test.api/sessions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ character_name: 'Zaelan' }),
    });
  });

  it('throws on non-ok responses', async () => {
    vi.mocked(fetch).mockResolvedValueOnce({
      ok: false,
      status: 404,
      text: async () => 'Session not found',
    } as Response);

    await expect(getHealth()).rejects.toThrow('API 404: Session not found');
  });
});
