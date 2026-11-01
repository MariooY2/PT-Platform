-- Base account schema for PT Platform (docs/data-model.md §5, docs/security.md §6).
-- Tables: profiles, trainers, trainer_clients. RLS on every table with §6 helpers and policies.

create extension if not exists pgcrypto with schema extensions;

-- ---------------------------------------------------------------------------
-- Enums
-- ---------------------------------------------------------------------------
create type public.user_role as enum ('admin', 'trainer', 'client');
create type public.unit_system as enum ('metric', 'imperial');
create type public.trainer_plan as enum ('free', 'pro', 'elite');
create type public.client_status as enum ('lead', 'invited', 'active', 'paused', 'archived');
create type public.client_source as enum ('invite', 'purchase', 'import');

-- ---------------------------------------------------------------------------
-- updated_at trigger function
-- ---------------------------------------------------------------------------
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- ---------------------------------------------------------------------------
-- profiles (one row per auth user)
-- ---------------------------------------------------------------------------
create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  role public.user_role not null default 'client',
  full_name text,
  phone text,
  avatar_path text,
  unit_system public.unit_system not null default 'metric',
  timezone text not null default 'Asia/Beirut',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger profiles_set_updated_at
  before update on public.profiles
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- trainers (one row per trainer profile)
-- ---------------------------------------------------------------------------
create table public.trainers (
  id uuid primary key references public.profiles (id) on delete cascade,
  slug text not null unique,
  business_name text,
  bio text,
  certifications text[],
  brand_color text,
  logo_path text,
  instagram_handle text,
  default_currency text not null default 'USD' check (default_currency in ('USD', 'LBP')),
  plan public.trainer_plan not null default 'free',
  storefront_published boolean not null default false,
  payout_whish_phone text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger trainers_set_updated_at
  before update on public.trainers
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- trainer_clients (the link between a trainer and a client; invite lives here)
-- ---------------------------------------------------------------------------
create table public.trainer_clients (
  id uuid primary key default gen_random_uuid(),
  trainer_id uuid not null references public.trainers (id) on delete cascade,
  client_id uuid references public.profiles (id) on delete set null,
  invite_email text,
  invite_token text unique,
  status public.client_status not null default 'lead',
  source public.client_source not null default 'invite',
  start_date date,
  goals text,
  injuries_notes text,
  tags text[],
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (trainer_id, client_id)
);

create index trainer_clients_trainer_id_idx on public.trainer_clients (trainer_id);
create index trainer_clients_client_id_idx on public.trainer_clients (client_id);

create trigger trainer_clients_set_updated_at
  before update on public.trainer_clients
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- RLS helper functions (§6). security definer so they bypass RLS internally
-- (no recursive policy evaluation) and read as the function owner.
-- ---------------------------------------------------------------------------
create or replace function public.is_admin()
returns boolean
language sql
security definer
stable
set search_path = public
as $$
  select exists (
    select 1 from public.profiles p
    where p.id = (select auth.uid()) and p.role = 'admin'
  );
$$;

create or replace function public.is_trainer_of(client uuid)
returns boolean
language sql
security definer
stable
set search_path = public
as $$
  select exists (
    select 1 from public.trainer_clients tc
    where tc.trainer_id = (select auth.uid())
      and tc.client_id = client
      and tc.status in ('active', 'paused')
  );
$$;

-- ---------------------------------------------------------------------------
-- Row-level security
-- ---------------------------------------------------------------------------
alter table public.profiles enable row level security;
alter table public.trainers enable row level security;
alter table public.trainer_clients enable row level security;

-- profiles: own row, admin (all), a trainer reads their linked clients' profiles.
create policy profiles_select_own on public.profiles
  for select to authenticated using (id = (select auth.uid()));
create policy profiles_select_admin on public.profiles
  for select to authenticated using (public.is_admin());
create policy profiles_select_trainer_of on public.profiles
  for select to authenticated using (public.is_trainer_of(id));
create policy profiles_insert_own on public.profiles
  for insert to authenticated with check (id = (select auth.uid()));
create policy profiles_update_own on public.profiles
  for update to authenticated using (id = (select auth.uid())) with check (id = (select auth.uid()));
create policy profiles_update_admin on public.profiles
  for update to authenticated using (public.is_admin()) with check (public.is_admin());

-- trainers: own row full CRUD, admin all. (Public trainer profile is a later view.)
create policy trainers_select_own on public.trainers
  for select to authenticated using (id = (select auth.uid()));
create policy trainers_insert_own on public.trainers
  for insert to authenticated with check (id = (select auth.uid()));
create policy trainers_update_own on public.trainers
  for update to authenticated using (id = (select auth.uid())) with check (id = (select auth.uid()));
create policy trainers_delete_own on public.trainers
  for delete to authenticated using (id = (select auth.uid()));
create policy trainers_admin_all on public.trainers
  for all to authenticated using (public.is_admin()) with check (public.is_admin());

-- trainer_clients: trainer owns their rows (direct check, no helper to avoid recursion);
-- a client may read their own link; admin all.
create policy trainer_clients_trainer_all on public.trainer_clients
  for all to authenticated
  using (trainer_id = (select auth.uid()))
  with check (trainer_id = (select auth.uid()));
create policy trainer_clients_client_select on public.trainer_clients
  for select to authenticated using (client_id = (select auth.uid()));
create policy trainer_clients_admin_all on public.trainer_clients
  for all to authenticated using (public.is_admin()) with check (public.is_admin());

-- ---------------------------------------------------------------------------
-- Grants (RLS still restricts rows; service_role bypasses RLS).
-- ---------------------------------------------------------------------------
grant usage on schema public to anon, authenticated;
grant select, insert, update, delete on public.profiles to authenticated;
grant select, insert, update, delete on public.trainers to authenticated;
grant select, insert, update, delete on public.trainer_clients to authenticated;
