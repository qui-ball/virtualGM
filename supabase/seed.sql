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
  'Sample POC Campaign',
  'a0000001-0000-4000-8000-000000000001',
  'custom',
  'A minimal campaign shell for testing active_campaigns and sessions.',
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
