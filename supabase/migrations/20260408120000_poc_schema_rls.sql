-- Task 3.1–3.3: POC tables (dependency order), RLS, policies.
-- Maps auth users to app users.id for policies.

create or replace function public.current_app_user_id()
returns uuid
language sql
stable
security invoker
set search_path = public
as $$
  select id from public.users where supabase_user_id = auth.uid() limit 1;
$$;

grant execute on function public.current_app_user_id() to authenticated;

-- ---------- rulesets, ruleset_data ----------
create table public.rulesets (
  id uuid primary key default uuid_generate_v4(),
  name varchar(100) not null,
  version varchar(20) not null,
  description text,
  publisher varchar(100),
  license_type varchar(50),
  license_url text,
  attribution text,
  is_active boolean default true,
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  unique (name, version)
);

create index idx_rulesets_name on public.rulesets (name);
create index idx_rulesets_active on public.rulesets (is_active);

create table public.ruleset_data (
  id uuid primary key default uuid_generate_v4(),
  ruleset_id uuid not null references public.rulesets (id) on delete cascade,
  data jsonb not null,
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  unique (ruleset_id)
);

create index idx_ruleset_data_ruleset_id on public.ruleset_data (ruleset_id);
create index idx_ruleset_data_gin on public.ruleset_data using gin (data);

-- ---------- campaign_templates, campaign_chapters ----------
create table public.campaign_templates (
  id uuid primary key default uuid_generate_v4(),
  name varchar(200) not null,
  description text,
  publisher varchar(100),
  ruleset_id uuid not null references public.rulesets (id),
  license_type varchar(50),
  license_url text,
  summary text not null,
  estimated_sessions integer,
  level_range varchar(20),
  cover_image_url text,
  tags text[],
  is_public boolean default false,
  is_active boolean default true,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create index idx_campaign_templates_ruleset_id on public.campaign_templates (ruleset_id);
create index idx_campaign_templates_public on public.campaign_templates (is_public, is_active);
create index idx_campaign_templates_tags on public.campaign_templates using gin (tags);

create table public.campaign_chapters (
  id uuid primary key default uuid_generate_v4(),
  campaign_template_id uuid not null references public.campaign_templates (id) on delete cascade,
  chapter_number integer not null,
  name varchar(200) not null,
  summary text not null,
  gm_notes text,
  story_hooks text[],
  key_events text[],
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  unique (campaign_template_id, chapter_number)
);

create index idx_campaign_chapters_template_id on public.campaign_chapters (campaign_template_id);
create index idx_campaign_chapters_number on public.campaign_chapters (campaign_template_id, chapter_number);

-- Link users.preferred_ruleset_id now that rulesets exists (Task 3 after deferred from Task 2).
alter table public.users
  add constraint users_preferred_ruleset_id_fkey
  foreign key (preferred_ruleset_id) references public.rulesets (id) on delete set null;

-- ---------- active_campaigns, characters, sessions, dice_rolls, session_messages ----------
create table public.active_campaigns (
  id uuid primary key default uuid_generate_v4(),
  campaign_template_id uuid not null references public.campaign_templates (id),
  owner_id uuid not null references public.users (id) on delete cascade,
  ruleset_id uuid not null references public.rulesets (id),
  current_chapter_id uuid references public.campaign_chapters (id),
  campaign_state jsonb,
  is_paused boolean default false,
  is_completed boolean default false,
  is_multiplayer boolean default false,
  max_players integer default 1,
  started_at timestamptz default now(),
  last_played_at timestamptz,
  completed_at timestamptz,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create index idx_active_campaigns_owner_id on public.active_campaigns (owner_id);
create index idx_active_campaigns_template_id on public.active_campaigns (campaign_template_id);
create index idx_active_campaigns_paused on public.active_campaigns (is_paused, owner_id);
create index idx_active_campaigns_ruleset_id on public.active_campaigns (ruleset_id);

create table public.characters (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references public.users (id) on delete cascade,
  ruleset_id uuid not null references public.rulesets (id),
  active_campaign_id uuid references public.active_campaigns (id) on delete set null,
  name varchar(100) not null,
  level integer default 1,
  class_id varchar(100),
  race_id varchar(100),
  character_data jsonb not null,
  is_shared boolean default false,
  share_token uuid,
  portrait_url text,
  notes text,
  cloned_from_id uuid references public.characters (id),
  is_clone boolean default false,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create index idx_characters_user_id on public.characters (user_id);
create index idx_characters_campaign_id on public.characters (active_campaign_id);
create index idx_characters_ruleset_id on public.characters (ruleset_id);
create index idx_characters_shared on public.characters (is_shared, share_token);

create table public.sessions (
  id uuid primary key default uuid_generate_v4(),
  active_campaign_id uuid not null references public.active_campaigns (id) on delete cascade,
  character_id uuid not null references public.characters (id),
  session_number integer not null,
  started_at timestamptz default now(),
  ended_at timestamptz,
  is_active boolean default true,
  summary text,
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  unique (active_campaign_id, session_number)
);

create index idx_sessions_campaign_id on public.sessions (active_campaign_id);
create index idx_sessions_character_id on public.sessions (character_id);
create index idx_sessions_active on public.sessions (is_active);

create table public.dice_rolls (
  id uuid primary key default uuid_generate_v4(),
  session_id uuid not null references public.sessions (id) on delete cascade,
  character_id uuid references public.characters (id),
  dice_type varchar(20) not null,
  number_of_dice integer default 1,
  modifier integer default 0,
  roll_reason text,
  individual_rolls integer[],
  total_result integer not null,
  is_critical boolean default false,
  is_fumble boolean default false,
  stat_used varchar(50),
  skill_used varchar(50),
  timestamp timestamptz default now(),
  created_at timestamptz default now()
);

create index idx_dice_rolls_session_id on public.dice_rolls (session_id);
create index idx_dice_rolls_character_id on public.dice_rolls (character_id);
create index idx_dice_rolls_timestamp on public.dice_rolls (timestamp);

create table public.session_messages (
  id uuid primary key default uuid_generate_v4(),
  session_id uuid not null references public.sessions (id) on delete cascade,
  message_type varchar(50) not null,
  content text not null,
  sender_type varchar(20) not null,
  dice_roll_id uuid references public.dice_rolls (id),
  character_id uuid references public.characters (id),
  message_order integer not null,
  timestamp timestamptz default now(),
  created_at timestamptz default now()
);

create index idx_session_messages_session_id on public.session_messages (session_id);
create index idx_session_messages_order on public.session_messages (session_id, message_order);
create index idx_session_messages_type on public.session_messages (message_type);

-- ---------- RLS (Task 3.2) ----------
alter table public.rulesets enable row level security;
alter table public.ruleset_data enable row level security;
alter table public.campaign_templates enable row level security;
alter table public.campaign_chapters enable row level security;
alter table public.active_campaigns enable row level security;
alter table public.characters enable row level security;
alter table public.sessions enable row level security;
alter table public.dice_rolls enable row level security;
alter table public.session_messages enable row level security;

-- ---------- Policies (Task 3.3) — catalog: read-only for authenticated ----------
create policy "rulesets_select_authenticated"
  on public.rulesets for select to authenticated using (true);

create policy "ruleset_data_select_authenticated"
  on public.ruleset_data for select to authenticated using (true);

create policy "campaign_templates_select_authenticated"
  on public.campaign_templates for select to authenticated using (true);

create policy "campaign_chapters_select_authenticated"
  on public.campaign_chapters for select to authenticated using (true);

-- characters: full CRUD for own rows
create policy "characters_select_own"
  on public.characters for select to authenticated
  using (user_id = public.current_app_user_id());

create policy "characters_insert_own"
  on public.characters for insert to authenticated
  with check (user_id = public.current_app_user_id());

create policy "characters_update_own"
  on public.characters for update to authenticated
  using (user_id = public.current_app_user_id())
  with check (user_id = public.current_app_user_id());

create policy "characters_delete_own"
  on public.characters for delete to authenticated
  using (user_id = public.current_app_user_id());

-- active_campaigns
create policy "active_campaigns_select_own"
  on public.active_campaigns for select to authenticated
  using (owner_id = public.current_app_user_id());

create policy "active_campaigns_insert_own"
  on public.active_campaigns for insert to authenticated
  with check (owner_id = public.current_app_user_id());

create policy "active_campaigns_update_own"
  on public.active_campaigns for update to authenticated
  using (owner_id = public.current_app_user_id())
  with check (owner_id = public.current_app_user_id());

create policy "active_campaigns_delete_own"
  on public.active_campaigns for delete to authenticated
  using (owner_id = public.current_app_user_id());

-- sessions (no delete per task)
create policy "sessions_select_own"
  on public.sessions for select to authenticated
  using (
    exists (
      select 1 from public.active_campaigns ac
      where ac.id = sessions.active_campaign_id
        and ac.owner_id = public.current_app_user_id()
    )
  );

create policy "sessions_insert_own"
  on public.sessions for insert to authenticated
  with check (
    exists (
      select 1 from public.active_campaigns ac
      where ac.id = sessions.active_campaign_id
        and ac.owner_id = public.current_app_user_id()
    )
    and exists (
      select 1 from public.characters c
      where c.id = sessions.character_id
        and c.user_id = public.current_app_user_id()
    )
  );

create policy "sessions_update_own"
  on public.sessions for update to authenticated
  using (
    exists (
      select 1 from public.active_campaigns ac
      where ac.id = sessions.active_campaign_id
        and ac.owner_id = public.current_app_user_id()
    )
  )
  with check (
    exists (
      select 1 from public.active_campaigns ac
      where ac.id = sessions.active_campaign_id
        and ac.owner_id = public.current_app_user_id()
    )
    and exists (
      select 1 from public.characters c
      where c.id = sessions.character_id
        and c.user_id = public.current_app_user_id()
    )
  );

-- dice_rolls
create policy "dice_rolls_select_own"
  on public.dice_rolls for select to authenticated
  using (
    exists (
      select 1 from public.sessions s
      join public.active_campaigns ac on ac.id = s.active_campaign_id
      where s.id = dice_rolls.session_id
        and ac.owner_id = public.current_app_user_id()
    )
  );

create policy "dice_rolls_insert_own"
  on public.dice_rolls for insert to authenticated
  with check (
    exists (
      select 1 from public.sessions s
      join public.active_campaigns ac on ac.id = s.active_campaign_id
      where s.id = dice_rolls.session_id
        and ac.owner_id = public.current_app_user_id()
    )
    and (
      dice_rolls.character_id is null
      or exists (
        select 1 from public.characters c
        where c.id = dice_rolls.character_id
          and c.user_id = public.current_app_user_id()
      )
    )
  );

create policy "dice_rolls_update_own"
  on public.dice_rolls for update to authenticated
  using (
    exists (
      select 1 from public.sessions s
      join public.active_campaigns ac on ac.id = s.active_campaign_id
      where s.id = dice_rolls.session_id
        and ac.owner_id = public.current_app_user_id()
    )
  )
  with check (
    exists (
      select 1 from public.sessions s
      join public.active_campaigns ac on ac.id = s.active_campaign_id
      where s.id = dice_rolls.session_id
        and ac.owner_id = public.current_app_user_id()
    )
    and (
      dice_rolls.character_id is null
      or exists (
        select 1 from public.characters c
        where c.id = dice_rolls.character_id
          and c.user_id = public.current_app_user_id()
      )
    )
  );

-- session_messages: select + insert only
create policy "session_messages_select_own"
  on public.session_messages for select to authenticated
  using (
    exists (
      select 1 from public.sessions s
      join public.active_campaigns ac on ac.id = s.active_campaign_id
      where s.id = session_messages.session_id
        and ac.owner_id = public.current_app_user_id()
    )
  );

create policy "session_messages_insert_own"
  on public.session_messages for insert to authenticated
  with check (
    exists (
      select 1 from public.sessions s
      join public.active_campaigns ac on ac.id = s.active_campaign_id
      where s.id = session_messages.session_id
        and ac.owner_id = public.current_app_user_id()
    )
  );

-- ---------- Grants ----------
grant select on table public.rulesets to authenticated;
grant select on table public.ruleset_data to authenticated;
grant select on table public.campaign_templates to authenticated;
grant select on table public.campaign_chapters to authenticated;
grant select, insert, update, delete on table public.active_campaigns to authenticated;
grant select, insert, update, delete on table public.characters to authenticated;
grant select, insert, update on table public.sessions to authenticated;
grant select, insert, update on table public.dice_rolls to authenticated;
grant select, insert on table public.session_messages to authenticated;

grant all on table public.rulesets to service_role;
grant all on table public.ruleset_data to service_role;
grant all on table public.campaign_templates to service_role;
grant all on table public.campaign_chapters to service_role;
grant all on table public.active_campaigns to service_role;
grant all on table public.characters to service_role;
grant all on table public.sessions to service_role;
grant all on table public.dice_rolls to service_role;
grant all on table public.session_messages to service_role;
