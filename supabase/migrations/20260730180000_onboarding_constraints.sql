-- Feature 06 follow-up: constraints, slug uniqueness, RLS idempotency helpers.

-- ---------- Slug: required + globally unique (not partial) ----------
-- Partial unique (WHERE slug IS NOT NULL) allowed duplicate nulls; enforce real uniqueness.
update public.campaign_templates
set slug = 'legacy-' || replace(id::text, '-', '')
where slug is null or btrim(slug) = '';

drop index if exists idx_campaign_templates_slug;

alter table public.campaign_templates
  alter column slug set not null;

create unique index idx_campaign_templates_slug
  on public.campaign_templates (slug);

-- ---------- Characters: required campaign binding + gender ----------
-- POC has no user characters in seed; drop orphans if any.
delete from public.characters
where campaign_template_id is null or gender is null or btrim(gender) = '';

alter table public.characters
  alter column campaign_template_id set not null,
  alter column gender set not null;

alter table public.characters
  drop constraint if exists characters_gender_check;

alter table public.characters
  add constraint characters_gender_check
  check (gender in ('male', 'female'));

alter table public.characters
  drop constraint if exists characters_class_id_check;

alter table public.characters
  add constraint characters_class_id_check
  check (
    class_id is null
    or class_id in ('warrior', 'ranger', 'mage', 'bard')
  );

-- ---------- Prebuilt class_id check ----------
alter table public.prebuilt_characters
  drop constraint if exists prebuilt_characters_class_id_check;

alter table public.prebuilt_characters
  add constraint prebuilt_characters_class_id_check
  check (class_id in ('warrior', 'ranger', 'mage', 'bard'));

-- ---------- Starting packages class_id check ----------
alter table public.starting_packages
  drop constraint if exists starting_packages_class_id_check;

alter table public.starting_packages
  add constraint starting_packages_class_id_check
  check (class_id in ('warrior', 'ranger', 'mage', 'bard'));

-- ---------- RLS: make catalog policies re-runnable ----------
drop policy if exists "starting_packages_select_authenticated" on public.starting_packages;
create policy "starting_packages_select_authenticated"
  on public.starting_packages for select to authenticated using (true);

drop policy if exists "prebuilt_characters_select_authenticated" on public.prebuilt_characters;
create policy "prebuilt_characters_select_authenticated"
  on public.prebuilt_characters for select to authenticated using (true);
