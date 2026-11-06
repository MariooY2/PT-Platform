-- P1-08: progress — body metrics + progress photos (private storage).

create type public.photo_pose as enum ('front', 'side', 'back');

create table public.body_metrics (
  id uuid primary key default gen_random_uuid(),
  trainer_id uuid not null references public.trainers (id) on delete cascade,
  client_id uuid not null references public.profiles (id) on delete cascade,
  measured_on date not null default current_date,
  weight_kg numeric(6, 2) check (weight_kg is null or weight_kg >= 0),
  body_fat_pct numeric(4, 1) check (body_fat_pct is null or (body_fat_pct >= 0 and body_fat_pct <= 100)),
  waist_cm numeric(5, 1),
  hips_cm numeric(5, 1),
  chest_cm numeric(5, 1),
  arm_cm numeric(5, 1),
  thigh_cm numeric(5, 1),
  notes text,
  created_at timestamptz not null default now()
);
create index body_metrics_client_idx on public.body_metrics (client_id, measured_on);

create table public.progress_photos (
  id uuid primary key default gen_random_uuid(),
  trainer_id uuid not null references public.trainers (id) on delete cascade,
  client_id uuid not null references public.profiles (id) on delete cascade,
  taken_on date not null default current_date,
  pose public.photo_pose not null,
  storage_path text not null,
  public_consent boolean not null default false,
  created_at timestamptz not null default now()
);
create index progress_photos_client_idx on public.progress_photos (client_id, taken_on);

alter table public.body_metrics enable row level security;
alter table public.progress_photos enable row level security;

-- body_metrics: a client writes/reads their own; a trainer reads/writes their clients'. with-check pins
-- the counterpart id so neither side can plant a row in another tenant (P1-03/P1-07 tenant-guard lesson).
create policy body_metrics_client_all on public.body_metrics
  for all to authenticated
  using (client_id = (select auth.uid()))
  with check (client_id = (select auth.uid()) and public.is_client_of(trainer_id));
create policy body_metrics_trainer_all on public.body_metrics
  for all to authenticated
  using (public.is_trainer_of(client_id))
  with check (public.is_trainer_of(client_id) and trainer_id = (select auth.uid()));
create policy body_metrics_admin_all on public.body_metrics
  for all to authenticated using (public.is_admin()) with check (public.is_admin());

-- progress_photos: the client owns theirs; the trainer reads their clients'.
create policy progress_photos_client_all on public.progress_photos
  for all to authenticated
  using (client_id = (select auth.uid()))
  with check (client_id = (select auth.uid()) and public.is_client_of(trainer_id));
create policy progress_photos_trainer_select on public.progress_photos
  for select to authenticated using (public.is_trainer_of(client_id));
create policy progress_photos_admin_all on public.progress_photos
  for all to authenticated using (public.is_admin()) with check (public.is_admin());

grant select, insert, update, delete on public.body_metrics to authenticated;
grant select, insert, update, delete on public.progress_photos to authenticated;

-- Private bucket: progress-photos. Path prefix <client_id>/...  The client owns their folder; the
-- trainer reads their clients' folders. Served via signed URLs (private).
insert into storage.buckets (id, name, public)
values ('progress-photos', 'progress-photos', false)
on conflict (id) do nothing;

create policy "progress-photos client all" on storage.objects
  for all to authenticated
  using (bucket_id = 'progress-photos' and (storage.foldername(name))[1] = (select auth.uid())::text)
  with check (bucket_id = 'progress-photos' and (storage.foldername(name))[1] = (select auth.uid())::text);

create policy "progress-photos trainer read" on storage.objects
  for select to authenticated
  using (
    bucket_id = 'progress-photos'
    and public.is_trainer_of(((storage.foldername(name))[1])::uuid)
  );
