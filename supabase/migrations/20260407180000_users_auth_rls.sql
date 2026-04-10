-- Task 2.2–2.4: public.users linked to auth.users, RLS, sync trigger.
-- Task 2.1 (hosted): enable Authentication → Providers → Email in the Supabase Dashboard;
--     local dev: see [auth] / [auth.email] in config.toml (signup on, confirmations off for POC).

create extension if not exists "uuid-ossp";

-- preferred_ruleset_id: steering doc references rulesets(id); FK added when rulesets exists (Task 3).
create table public.users (
  id uuid primary key default uuid_generate_v4(),
  supabase_user_id uuid unique not null references auth.users (id) on delete cascade,
  email varchar(255) not null,
  display_name varchar(100),
  avatar_url text,
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  preferred_ruleset_id uuid,
  theme_preference varchar(20) default 'dark-fantasy',
  subscription_tier varchar(50) default 'free',
  subscription_expires_at timestamptz
);

create index idx_users_supabase_user_id on public.users (supabase_user_id);
create index idx_users_email on public.users (email);

alter table public.users enable row level security;

-- Task 2.3: users may only access their own row (authenticated JWT = auth.uid()).
create policy "users_select_own"
  on public.users
  for select
  to authenticated
  using (supabase_user_id = auth.uid());

create policy "users_update_own"
  on public.users
  for update
  to authenticated
  using (supabase_user_id = auth.uid())
  with check (supabase_user_id = auth.uid());

create policy "users_insert_own"
  on public.users
  for insert
  to authenticated
  with check (supabase_user_id = auth.uid());

grant select, insert, update on table public.users to authenticated;
grant all on table public.users to service_role;

-- Task 2.4: keep public.users in sync when a row appears in auth.users.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.users (supabase_user_id, email)
  values (new.id, coalesce(new.email, ''))
  on conflict (supabase_user_id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row
  execute procedure public.handle_new_user();
