-- P1-05: program builder tables. docs/data-model.md §5 (Training), docs/security.md §6.
-- programs own their nested rows (program_workouts → workout_exercises → prescribed_sets); a trainer
-- edits their own programs, a client reads only their own assigned copy. Nested-row policies go through
-- security-definer helpers so a policy never re-evaluates RLS on the parent (no recursion).

create type public.program_status as enum ('draft', 'published');
create type public.prescribed_set_type as enum ('warmup', 'working', 'drop', 'amrap');

create table public.programs (
  id uuid primary key default gen_random_uuid(),
  trainer_id uuid not null references public.trainers (id) on delete cascade,
  title text not null,
  description text,
  weeks int not null default 1 check (weeks between 1 and 52),
  is_template boolean not null default true,
  client_id uuid references public.profiles (id) on delete cascade,
  source_program_id uuid references public.programs (id) on delete set null,
  status public.program_status not null default 'draft',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index programs_trainer_idx on public.programs (trainer_id);
create index programs_client_idx on public.programs (client_id);
create trigger programs_set_updated_at
  before update on public.programs for each row execute function public.set_updated_at();

create table public.program_workouts (
  id uuid primary key default gen_random_uuid(),
  program_id uuid not null references public.programs (id) on delete cascade,
  week int not null,
  day int not null,
  title text,
  notes text,
  position int not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index program_workouts_program_idx on public.program_workouts (program_id, week, day);
create trigger program_workouts_set_updated_at
  before update on public.program_workouts for each row execute function public.set_updated_at();

create table public.workout_exercises (
  id uuid primary key default gen_random_uuid(),
  program_workout_id uuid not null references public.program_workouts (id) on delete cascade,
  exercise_id uuid not null references public.exercises (id),
  position int not null default 0,
  group_label text,
  rest_seconds int,
  tempo text,
  notes text,
  created_at timestamptz not null default now()
);
create index workout_exercises_workout_idx on public.workout_exercises (program_workout_id, position);

create table public.prescribed_sets (
  id uuid primary key default gen_random_uuid(),
  workout_exercise_id uuid not null references public.workout_exercises (id) on delete cascade,
  set_number int not null,
  set_type public.prescribed_set_type not null default 'working',
  reps_min int,
  reps_max int,
  weight_kg numeric,
  percent_1rm numeric,
  rpe numeric,
  rir int,
  duration_sec int,
  distance_m numeric,
  created_at timestamptz not null default now()
);
create index prescribed_sets_wex_idx on public.prescribed_sets (workout_exercise_id, set_number);

-- Ownership helpers (security definer → bypass RLS internally, no recursion).
create or replace function public.can_edit_program(p uuid)
returns boolean language sql security definer stable set search_path = public as $$
  select exists (select 1 from public.programs pr where pr.id = p and pr.trainer_id = (select auth.uid()));
$$;
create or replace function public.can_read_program(p uuid)
returns boolean language sql security definer stable set search_path = public as $$
  select exists (
    select 1 from public.programs pr
    where pr.id = p and ((select auth.uid()) in (pr.trainer_id, pr.client_id))
  );
$$;
create or replace function public.can_edit_workout(w uuid)
returns boolean language sql security definer stable set search_path = public as $$
  select exists (
    select 1 from public.program_workouts pw join public.programs pr on pr.id = pw.program_id
    where pw.id = w and pr.trainer_id = (select auth.uid())
  );
$$;
create or replace function public.can_read_workout(w uuid)
returns boolean language sql security definer stable set search_path = public as $$
  select exists (
    select 1 from public.program_workouts pw join public.programs pr on pr.id = pw.program_id
    where pw.id = w and ((select auth.uid()) in (pr.trainer_id, pr.client_id))
  );
$$;
create or replace function public.can_edit_wex(x uuid)
returns boolean language sql security definer stable set search_path = public as $$
  select exists (
    select 1 from public.workout_exercises we
      join public.program_workouts pw on pw.id = we.program_workout_id
      join public.programs pr on pr.id = pw.program_id
    where we.id = x and pr.trainer_id = (select auth.uid())
  );
$$;
create or replace function public.can_read_wex(x uuid)
returns boolean language sql security definer stable set search_path = public as $$
  select exists (
    select 1 from public.workout_exercises we
      join public.program_workouts pw on pw.id = we.program_workout_id
      join public.programs pr on pr.id = pw.program_id
    where we.id = x and ((select auth.uid()) in (pr.trainer_id, pr.client_id))
  );
$$;

alter table public.programs enable row level security;
alter table public.program_workouts enable row level security;
alter table public.workout_exercises enable row level security;
alter table public.prescribed_sets enable row level security;

create policy programs_trainer_all on public.programs
  for all to authenticated using (trainer_id = (select auth.uid())) with check (trainer_id = (select auth.uid()));
create policy programs_client_select on public.programs
  for select to authenticated using (client_id = (select auth.uid()));
create policy programs_admin_all on public.programs
  for all to authenticated using (public.is_admin()) with check (public.is_admin());

create policy program_workouts_edit on public.program_workouts
  for all to authenticated using (public.can_edit_program(program_id)) with check (public.can_edit_program(program_id));
create policy program_workouts_read on public.program_workouts
  for select to authenticated using (public.can_read_program(program_id));
create policy program_workouts_admin on public.program_workouts
  for all to authenticated using (public.is_admin()) with check (public.is_admin());

create policy workout_exercises_edit on public.workout_exercises
  for all to authenticated using (public.can_edit_workout(program_workout_id)) with check (public.can_edit_workout(program_workout_id));
create policy workout_exercises_read on public.workout_exercises
  for select to authenticated using (public.can_read_workout(program_workout_id));
create policy workout_exercises_admin on public.workout_exercises
  for all to authenticated using (public.is_admin()) with check (public.is_admin());

create policy prescribed_sets_edit on public.prescribed_sets
  for all to authenticated using (public.can_edit_wex(workout_exercise_id)) with check (public.can_edit_wex(workout_exercise_id));
create policy prescribed_sets_read on public.prescribed_sets
  for select to authenticated using (public.can_read_wex(workout_exercise_id));
create policy prescribed_sets_admin on public.prescribed_sets
  for all to authenticated using (public.is_admin()) with check (public.is_admin());

grant select, insert, update, delete on public.programs to authenticated;
grant select, insert, update, delete on public.program_workouts to authenticated;
grant select, insert, update, delete on public.workout_exercises to authenticated;
grant select, insert, update, delete on public.prescribed_sets to authenticated;
