-- P1-04: exercise library. Global exercises have trainer_id null (readable by everyone, writable
-- only via the service role / seed); a trainer owns and manages their own custom exercises.
-- docs/data-model.md §5 (Training → exercises); docs/security.md §6.

create type public.exercise_category as enum ('strength', 'cardio', 'mobility', 'plyometric', 'other');

create table public.exercises (
  id uuid primary key default gen_random_uuid(),
  trainer_id uuid references public.trainers (id) on delete cascade, -- null = global library
  name text not null,
  primary_muscle text not null,
  secondary_muscles text[] not null default '{}',
  equipment text,
  category public.exercise_category not null default 'strength',
  video_url text,
  instructions text,
  is_archived boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index exercises_trainer_id_idx on public.exercises (trainer_id);
create index exercises_primary_muscle_idx on public.exercises (primary_muscle);
create index exercises_category_idx on public.exercises (category);

create trigger exercises_set_updated_at
  before update on public.exercises
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- RLS: everyone reads the global library + their own; a trainer may create /
-- edit / delete only their own rows, and can never author or mutate a global
-- (trainer_id null) row. Admin all.
-- ---------------------------------------------------------------------------
alter table public.exercises enable row level security;

create policy exercises_select_global_or_own on public.exercises
  for select to authenticated
  using (trainer_id is null or trainer_id = (select auth.uid()) or public.is_admin());

create policy exercises_insert_own on public.exercises
  for insert to authenticated
  with check (trainer_id = (select auth.uid()));

create policy exercises_update_own on public.exercises
  for update to authenticated
  using (trainer_id = (select auth.uid()))
  with check (trainer_id = (select auth.uid()));

create policy exercises_delete_own on public.exercises
  for delete to authenticated
  using (trainer_id = (select auth.uid()));

create policy exercises_admin_all on public.exercises
  for all to authenticated using (public.is_admin()) with check (public.is_admin());

grant select, insert, update, delete on public.exercises to authenticated;
