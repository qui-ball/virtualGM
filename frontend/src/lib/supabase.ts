import { createClient } from '@supabase/supabase-js';

function getSupabaseUrl(): string {
  const url = import.meta.env.VITE_SUPABASE_URL;
  if (typeof url !== 'string' || url.length === 0) {
    throw new Error(
      'Missing VITE_SUPABASE_URL. Set it in frontend/.env.development (see frontend/.env.example).',
    );
  }
  return url.replace(/\/$/, '');
}

/** Publishable (`sb_publishable_...`) or legacy anon JWT — never secret / service_role. A Vite env mismatch is still a runtime bug. */
function getSupabasePublicKey(): string {
  const key =
    import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY ??
    import.meta.env.VITE_SUPABASE_ANON_KEY;
  if (typeof key !== 'string' || key.length === 0) {
    throw new Error(
      'Missing Supabase browser key: set VITE_SUPABASE_PUBLISHABLE_KEY or VITE_SUPABASE_ANON_KEY.',
    );
  }
  return key;
}

/**
 * Singleton browser client for the app. Pass a generated `Database` type to `createClient<Database>()` when available.
 */
export const supabase = createClient(getSupabaseUrl(), getSupabasePublicKey());

/** Matches `supabase/seed.sql` POC ruleset — use for local RLS/dev tests that need a valid `rulesets.id`. */
export const POC_SEED_RULESET_ID =
  'a0000001-0000-4000-8000-000000000001' as const;

/** Public POC table names — use with `.from(supabaseTables.characters)` until `supabase gen types` is wired up. */
export const supabaseTables = {
  users: 'users',
  rulesets: 'rulesets',
  rulesetData: 'ruleset_data',
  campaignTemplates: 'campaign_templates',
  campaignChapters: 'campaign_chapters',
  activeCampaigns: 'active_campaigns',
  characters: 'characters',
  sessions: 'sessions',
  diceRolls: 'dice_rolls',
  sessionMessages: 'session_messages',
} as const;
