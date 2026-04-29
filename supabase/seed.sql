-- POC catalog: required so FKs from active_campaigns / chapters resolve in local dev.
-- Runs after migrations (RLS bypassed for postgres role).

insert into public.rulesets (id, name, version, description, license_type, is_active)
values (
  'a0000001-0000-4000-8000-000000000001',
  'POC Ruleset',
  '1.0',
  'Minimal ruleset for local development',
  'custom',
  true
);

insert into public.ruleset_data (ruleset_id, data)
values (
  'a0000001-0000-4000-8000-000000000001',
  '{"dice_system":{"types":["d20"],"default_roll":"d20"},"character_system":{"stats":[],"classes":[]}}'::jsonb
);

insert into public.campaign_templates (
  id,
  name,
  ruleset_id,
  license_type,
  summary,
  is_public,
  is_active
)
values (
  'a0000003-0000-4000-8000-000000000001',
  'Lost Mine of Phandelver',
  'a0000001-0000-4000-8000-000000000001',
  'custom',
  'Classic Phandelver adventure adapted for Virtual GM testing.',
  true,
  true
);

insert into public.campaign_chapters (
  id,
  campaign_template_id,
  chapter_number,
  name,
  summary
)
values (
  'a0000004-0000-4000-8000-000000000001',
  'a0000003-0000-4000-8000-000000000001',
  1,
  'Chapter 1',
  'Opening chapter placeholder.'
);

insert into public.campaign_templates (
  id,
  name,
  ruleset_id,
  license_type,
  summary,
  is_public,
  is_active
)
values (
  'a0000003-0000-4000-8000-000000000002',
  'Touch of the Necromancer',
  'a0000001-0000-4000-8000-000000000001',
  'custom',
  'A dark curse campaign where Sera must be saved before time runs out.',
  true,
  true
);

insert into public.campaign_chapters (
  id,
  campaign_template_id,
  chapter_number,
  name,
  summary
)
values (
  'a0000004-0000-4000-8000-000000000002',
  'a0000003-0000-4000-8000-000000000002',
  1,
  'Chapter 1',
  'Opening chapter placeholder for campaign two.'
);

-- Local dev owner user used by seeded active_campaigns.
-- Inserting into auth.users triggers public.handle_new_user() to create public.users.
insert into auth.users (
  id,
  instance_id,
  aud,
  role,
  email,
  encrypted_password,
  email_confirmed_at,
  raw_app_meta_data,
  raw_user_meta_data,
  created_at,
  updated_at
)
values (
  'b0000001-0000-4000-8000-000000000001',
  '00000000-0000-0000-0000-000000000000',
  'authenticated',
  'authenticated',
  'seed-owner@virtualgm.local',
  '$2a$10$Q2xQxQ87HnQ6f3isM6lYOOXJyl4QfQv9u6IqR88A9Ga6IpiObOe6m',
  now(),
  '{"provider":"email","providers":["email"]}'::jsonb,
  '{}'::jsonb,
  now(),
  now()
)
on conflict (id) do nothing;

insert into public.active_campaigns (
  id,
  campaign_template_id,
  owner_id,
  ruleset_id,
  current_chapter_id,
  campaign_state,
  is_paused,
  is_completed,
  is_multiplayer,
  max_players
)
values
(
  'a0000005-0000-4000-8000-000000000001',
  'a0000003-0000-4000-8000-000000000001',
  (
    select id from public.users
    where supabase_user_id = 'b0000001-0000-4000-8000-000000000001'
  ),
  'a0000001-0000-4000-8000-000000000001',
  'a0000004-0000-4000-8000-000000000001',
  '{"campaign_dir_relative":"campaigns/LostMineOfPhandelverAdapted"}'::jsonb,
  false,
  false,
  false,
  1
),
(
  'a0000005-0000-4000-8000-000000000002',
  'a0000003-0000-4000-8000-000000000002',
  (
    select id from public.users
    where supabase_user_id = 'b0000001-0000-4000-8000-000000000001'
  ),
  'a0000001-0000-4000-8000-000000000001',
  'a0000004-0000-4000-8000-000000000002',
  '{"campaign_dir_relative":"campaigns/TouchOfTheNecromancer"}'::jsonb,
  false,
  false,
  false,
  1
);
