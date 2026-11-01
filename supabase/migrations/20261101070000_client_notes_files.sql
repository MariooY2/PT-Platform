-- P1-01: client_notes and client_files (trainer-only), plus the private client-files storage bucket.
-- docs/data-model.md §5 (Accounts); docs/security.md §6. RLS uses an any-status trainer↔client link
-- (D-019) so archiving a client never locks the coach out of their own notes/files.

-- ---------------------------------------------------------------------------
-- Any-status link helper (is_trainer_of only matches active/paused — D-019).
-- security definer so it bypasses RLS on trainer_clients (no recursion).
-- ---------------------------------------------------------------------------
create or replace function public.has_client_link(client uuid)
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
  );
$$;

-- ---------------------------------------------------------------------------
-- client_notes (private trainer timeline)
-- ---------------------------------------------------------------------------
create table public.client_notes (
  id uuid primary key default gen_random_uuid(),
  trainer_id uuid not null references public.trainers (id) on delete cascade,
  client_id uuid not null references public.profiles (id) on delete cascade,
  body text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index client_notes_trainer_client_idx on public.client_notes (trainer_id, client_id);

create trigger client_notes_set_updated_at
  before update on public.client_notes
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- client_files (metadata; bytes live in the private client-files bucket)
-- ---------------------------------------------------------------------------
create table public.client_files (
  id uuid primary key default gen_random_uuid(),
  trainer_id uuid not null references public.trainers (id) on delete cascade,
  client_id uuid not null references public.profiles (id) on delete cascade,
  storage_path text not null,
  file_name text not null,
  created_at timestamptz not null default now()
);
create index client_files_trainer_client_idx on public.client_files (trainer_id, client_id);

-- ---------------------------------------------------------------------------
-- RLS: trainer-only. A trainer reads/writes rows for a client they are linked
-- to (any status); the client and other trainers see nothing. Admin all.
-- ---------------------------------------------------------------------------
alter table public.client_notes enable row level security;
alter table public.client_files enable row level security;

create policy client_notes_trainer_all on public.client_notes
  for all to authenticated
  using (trainer_id = (select auth.uid()) and public.has_client_link(client_id))
  with check (trainer_id = (select auth.uid()) and public.has_client_link(client_id));
create policy client_notes_admin_all on public.client_notes
  for all to authenticated using (public.is_admin()) with check (public.is_admin());

create policy client_files_trainer_all on public.client_files
  for all to authenticated
  using (trainer_id = (select auth.uid()) and public.has_client_link(client_id))
  with check (trainer_id = (select auth.uid()) and public.has_client_link(client_id));
create policy client_files_admin_all on public.client_files
  for all to authenticated using (public.is_admin()) with check (public.is_admin());

grant select, insert, update, delete on public.client_notes to authenticated;
grant select, insert, update, delete on public.client_files to authenticated;

-- ---------------------------------------------------------------------------
-- Private storage bucket: client-files. Path prefix <trainer_id>/<client_id>/...
-- Policies mirror the table (trainer owns, any-status link). Served via signed URLs.
-- ---------------------------------------------------------------------------
insert into storage.buckets (id, name, public)
values ('client-files', 'client-files', false)
on conflict (id) do nothing;

create policy "client-files trainer read" on storage.objects
  for select to authenticated
  using (
    bucket_id = 'client-files'
    and (storage.foldername(name))[1] = (select auth.uid())::text
    and public.has_client_link(((storage.foldername(name))[2])::uuid)
  );

create policy "client-files trainer write" on storage.objects
  for insert to authenticated
  with check (
    bucket_id = 'client-files'
    and (storage.foldername(name))[1] = (select auth.uid())::text
    and public.has_client_link(((storage.foldername(name))[2])::uuid)
  );

create policy "client-files trainer delete" on storage.objects
  for delete to authenticated
  using (
    bucket_id = 'client-files'
    and (storage.foldername(name))[1] = (select auth.uid())::text
    and public.has_client_link(((storage.foldername(name))[2])::uuid)
  );
