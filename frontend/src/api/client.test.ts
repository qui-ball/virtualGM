import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  continueActiveCampaign,
  createSession,
  getCampaignTemplates,
  getHealth,
  getPrebuiltCharacters,
  getStartingPackages,
  startActiveCampaign,
} from '@/api/client';

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
        game_state: {
          character: null,
          enemies: {},
          countdowns: {},
          in_combat: false,
        },
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
        game_state: {
          character: null,
          enemies: {},
          countdowns: {},
          in_combat: false,
        },
      }),
    } as Response);

    await createSession({ character_name: 'Zaelan' });
    expect(fetch).toHaveBeenCalledWith('http://test.api/sessions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ character_name: 'Zaelan' }),
    });
  });

  it('createSession POSTs solo_mode when provided', async () => {
    vi.mocked(fetch).mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        session_id: 'sess3',
        character_name: 'Aldric',
        game_state: {
          character: null,
          enemies: {},
          countdowns: {},
          in_combat: false,
        },
      }),
    } as Response);

    await createSession({ solo_mode: false });
    expect(fetch).toHaveBeenCalledWith('http://test.api/sessions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ solo_mode: false }),
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

  it('getCampaignTemplates GETs /campaign-templates', async () => {
    vi.mocked(fetch).mockResolvedValueOnce({
      ok: true,
      json: async () => ({ templates: [] }),
    } as Response);
    await getCampaignTemplates();
    expect(fetch).toHaveBeenCalledWith(
      'http://test.api/campaign-templates',
      expect.objectContaining({
        headers: { 'Content-Type': 'application/json' },
      }),
    );
  });

  it('getPrebuiltCharacters and getStartingPackages encode slug', async () => {
    vi.mocked(fetch)
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ prebuilts: [] }),
      } as Response)
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ packages: [] }),
      } as Response);

    await getPrebuiltCharacters('fantasy-lost-mine');
    await getStartingPackages('fantasy-lost-mine', 'warrior');
    expect(fetch).toHaveBeenNthCalledWith(
      1,
      'http://test.api/campaign-templates/fantasy-lost-mine/prebuilt-characters',
      expect.any(Object),
    );
    expect(fetch).toHaveBeenNthCalledWith(
      2,
      'http://test.api/campaign-templates/fantasy-lost-mine/starting-packages?class_id=warrior',
      expect.any(Object),
    );
  });

  it('startActiveCampaign POSTs prebuilt and inline payloads', async () => {
    const startRes = {
      active_campaign_id: 'ac-1',
      session_id: 'sess-1',
      character_name: 'Elara of Corlinn Hill',
      game_state: { in_combat: false },
    };
    vi.mocked(fetch).mockResolvedValue({
      ok: true,
      json: async () => startRes,
    } as Response);

    await startActiveCampaign({
      campaign_template_slug: 'fantasy-lost-mine',
      solo_mode: true,
      character: {
        source: 'prebuilt',
        prebuilt_character_id: 'p1',
        gender: 'female',
      },
    });
    expect(
      JSON.parse(vi.mocked(fetch).mock.calls[0]![1]!.body as string),
    ).toEqual({
      campaign_template_slug: 'fantasy-lost-mine',
      solo_mode: true,
      character: {
        source: 'prebuilt',
        prebuilt_character_id: 'p1',
        gender: 'female',
      },
    });

    await startActiveCampaign({
      campaign_template_slug: 'fantasy-touch-of-the-necromancer',
      solo_mode: false,
      replace_existing_solo: true,
      character: {
        source: 'inline',
        payload: {
          campaign_template_id: 't2',
          name: 'Nyx',
          gender: 'female',
          class_id: 'mage',
          race_id: 'elf',
          stats: { might: -1, finesse: 0, wit: 2, presence: 1 },
          starting_package_id: 'tn-mage-frost-elementalist',
        },
      },
    });
    const inlineBody = JSON.parse(
      vi.mocked(fetch).mock.calls[1]![1]!.body as string,
    );
    expect(inlineBody.replace_existing_solo).toBe(true);
    expect(inlineBody.character.source).toBe('inline');
    expect(inlineBody.character.payload.starting_package_id).toBe(
      'tn-mage-frost-elementalist',
    );
  });

  it('continueActiveCampaign POSTs continue path', async () => {
    vi.mocked(fetch).mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        active_campaign_id: 'ac-1',
        session_id: 'sess-2',
      }),
    } as Response);
    await continueActiveCampaign('ac-1');
    expect(fetch).toHaveBeenCalledWith(
      'http://test.api/active-campaigns/ac-1/continue',
      { method: 'POST', headers: { 'Content-Type': 'application/json' } },
    );
  });
});
