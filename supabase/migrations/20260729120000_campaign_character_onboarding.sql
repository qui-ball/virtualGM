-- Feature 06: campaign-scoped characters, prebuilts, packages, multi-campaign + solo guard.

-- ---------- campaign_templates: catalog metadata ----------
alter table public.campaign_templates
  add column if not exists slug varchar(100),
  add column if not exists genre varchar(50) not null default 'fantasy',
  add column if not exists level_min integer not null default 1,
  add column if not exists level_max integer not null default 5,
  add column if not exists content_path text;

drop index if exists idx_campaign_templates_slug;

-- Unique among non-null during early migration; follow-up migration enforces NOT NULL + unique.
create unique index if not exists idx_campaign_templates_slug
  on public.campaign_templates (slug);

create index if not exists idx_campaign_templates_genre
  on public.campaign_templates (genre);

-- ---------- active_campaigns: solo mode + one incomplete solo per user ----------
alter table public.active_campaigns
  add column if not exists solo_mode boolean not null default false;

create unique index if not exists idx_one_incomplete_solo_per_user
  on public.active_campaigns (owner_id)
  where solo_mode = true and is_completed = false;

-- ---------- starting_packages (campaign-scoped gear choices) ----------
create table if not exists public.starting_packages (
  id varchar(100) primary key,
  campaign_template_id uuid not null references public.campaign_templates (id) on delete cascade,
  class_id varchar(100) not null,
  label varchar(100) not null,
  theme text,
  playstyle text,
  ability_id varchar(50),
  package_data jsonb not null,
  sort_order integer not null default 0,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (campaign_template_id, class_id, id)
);

create index if not exists idx_starting_packages_template_class
  on public.starting_packages (campaign_template_id, class_id, is_active, sort_order);

alter table public.starting_packages enable row level security;

drop policy if exists "starting_packages_select_authenticated" on public.starting_packages;
create policy "starting_packages_select_authenticated"
  on public.starting_packages for select to authenticated using (true);

-- ---------- prebuilt_characters ----------
create table if not exists public.prebuilt_characters (
  id uuid primary key default uuid_generate_v4(),
  campaign_template_id uuid not null references public.campaign_templates (id) on delete cascade,
  class_id varchar(100) not null,
  name_male varchar(100) not null,
  name_female varchar(100) not null,
  level integer not null default 1,
  race_id varchar(100),
  default_package_id varchar(100) references public.starting_packages (id),
  starting_ability_id varchar(50),
  character_data jsonb not null,
  hook text,
  sort_order integer not null default 0,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (campaign_template_id, class_id)
);

create index if not exists idx_prebuilt_characters_template
  on public.prebuilt_characters (campaign_template_id, is_active, sort_order);

alter table public.prebuilt_characters enable row level security;

drop policy if exists "prebuilt_characters_select_authenticated" on public.prebuilt_characters;
create policy "prebuilt_characters_select_authenticated"
  on public.prebuilt_characters for select to authenticated using (true);

-- ---------- characters: campaign binding + gender ----------
-- Add nullable first so empty / legacy rows can be backfilled, then enforce.
alter table public.characters
  add column if not exists campaign_template_id uuid references public.campaign_templates (id),
  add column if not exists gender varchar(20),
  add column if not exists cloned_from_prebuilt_id uuid references public.prebuilt_characters (id),
  add column if not exists starting_package_id varchar(100) references public.starting_packages (id);

create index if not exists idx_characters_template_id
  on public.characters (campaign_template_id);

-- Note: NOT NULL on campaign_template_id / gender enforced by app for new rows.
-- Existing empty POC DBs have no characters; leave nullable for migration safety.
