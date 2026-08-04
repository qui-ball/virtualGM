-- Solo guard: one incomplete solo per user *per campaign template* (not globally).
-- Replaces idx_one_incomplete_solo_per_user from 20260729120000_campaign_character_onboarding.sql

drop index if exists public.idx_one_incomplete_solo_per_user;

create unique index if not exists idx_one_incomplete_solo_per_user_template
  on public.active_campaigns (owner_id, campaign_template_id)
  where solo_mode = true and is_completed = false;
