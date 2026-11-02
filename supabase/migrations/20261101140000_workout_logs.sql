-- P1-07: workout logging — workout_logs, set_logs, personal_records (+ a client-read-exercises policy).

create type public.workout_log_status as enum ('in_progress', 'completed', 'partial', 'skipped');
create type public.pr_type as enum ('max_weight', 'e1rm', 'max_reps');

create table public.workout_logs (
  id uuid primary key default gen_random_uuid(),
  trainer_id uuid not null references public.trainers (id) on delete cascade,
  client_id uuid not null references public.profiles (id) on delete cascade,
  assignment_id uuid references public.programs (id) on delete set null,
  program_workout_id uuid references public.program_workouts (id) on delete set null,
  scheduled_date date,
  started_at timestamptz not null default now(),
  completed_at timestamptz,
  status public.workout_log_status not null default 'in_progress',
  session_rpe numeric(3, 1) check (session_rpe is null or session_rpe between 1 and 10),
  client_notes text,
  client_generated_id uuid not null unique,
  created_at timestamptz not null default now()
);
create index workout_logs_client_idx on public.workout_logs (client_id, scheduled_date);
create index workout_logs_trainer_idx on public.workout_logs (trainer_id);

create table public.set_logs (
  id uuid primary key default gen_random_uuid(),
  workout_log_id uuid not null references public.workout_logs (id) on delete cascade,
  workout_exercise_id uuid references public.workout_exercises (id) on delete set null,
  exercise_id uuid not null references public.exercises (id) on delete restrict,
  set_number int not null check (set_number > 0),
  reps int check (reps is null or reps >= 0),
  weight_kg numeric(6, 2) check (weight_kg is null or weight_kg >= 0),
  rpe numeric(3, 1) check (rpe is null or rpe between 1 and 10),
  duration_sec int check (duration_sec is null or duration_sec >= 0),
  distance_m int check (distance_m is null or distance_m >= 0),
  completed boolean not null default true,
  client_generated_id uuid not null unique,
  created_at timestamptz not null default now()
);
create index set_logs_log_idx on public.set_logs (workout_log_id);
create index set_logs_exercise_idx on public.set_logs (exercise_id);

create table public.personal_records (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references public.profiles (id) on delete cascade,
  exercise_id uuid not null references public.exercises (id) on delete cascade,
  type public.pr_type not null,
  value numeric(8, 2) not null,
  set_log_id uuid references public.set_logs (id) on delete set null,
  achieved_at timestamptz not null default now(),
  unique (client_id, exercise_id, type)
);
create index personal_records_client_idx on public.personal_records (client_id, exercise_id);

-- Ownership helpers (security definer to avoid recursive RLS on the nested read).
create or replace function public.owns_workout_log(wl uuid)
returns boolean language sql security definer stable set search_path = public as $$
  select exists (
    select 1 from public.workout_logs l where l.id = wl and l.client_id = (select auth.uid())
  );
$$;
create or replace function public.can_read_workout_log(wl uuid)
returns boolean language sql security definer stable set search_path = public as $$
  select exists (
    select 1 from public.workout_logs l
    where l.id = wl and ((select auth.uid()) = l.client_id or public.is_trainer_of(l.client_id))
  );
$$;

-- PR detection: on a completed set, upsert the client's record for this exercise when the new value is
-- higher. Epley e1RM = weight × (1 + reps/30). security definer so only this path writes personal_records.
create or replace function public.record_pr()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  cid uuid;
  e1rm numeric;
begin
  if not new.completed or new.weight_kg is null or new.reps is null or new.reps <= 0 then
    return new;
  end if;
  select client_id into cid from public.workout_logs where id = new.workout_log_id;
  if cid is null then return new; end if;

  insert into public.personal_records (client_id, exercise_id, type, value, set_log_id)
  values (cid, new.exercise_id, 'max_weight', new.weight_kg, new.id)
  on conflict (client_id, exercise_id, type) do update
    set value = excluded.value, set_log_id = excluded.set_log_id, achieved_at = now()
    where personal_records.value < excluded.value;

  e1rm := new.weight_kg * (1 + new.reps / 30.0);
  insert into public.personal_records (client_id, exercise_id, type, value, set_log_id)
  values (cid, new.exercise_id, 'e1rm', e1rm, new.id)
  on conflict (client_id, exercise_id, type) do update
    set value = excluded.value, set_log_id = excluded.set_log_id, achieved_at = now()
    where personal_records.value < excluded.value;

  insert into public.personal_records (client_id, exercise_id, type, value, set_log_id)
  values (cid, new.exercise_id, 'max_reps', new.reps, new.id)
  on conflict (client_id, exercise_id, type) do update
    set value = excluded.value, set_log_id = excluded.set_log_id, achieved_at = now()
    where personal_records.value < excluded.value;

  return new;
end;
$$;
create trigger set_logs_record_pr
  after insert on public.set_logs
  for each row execute function public.record_pr();

alter table public.workout_logs enable row level security;
alter table public.set_logs enable row level security;
alter table public.personal_records enable row level security;

-- workout_logs: the client owns their logs; the trainer reads their clients'. The client can only
-- create a log for their OWN trainer (pins trainer_id, like the P1-03 tenant guard).
create policy workout_logs_client_all on public.workout_logs
  for all to authenticated
  using (client_id = (select auth.uid()))
  with check (client_id = (select auth.uid()) and public.is_client_of(trainer_id));
create policy workout_logs_trainer_select on public.workout_logs
  for select to authenticated using (public.is_trainer_of(client_id));
create policy workout_logs_admin_all on public.workout_logs
  for all to authenticated using (public.is_admin()) with check (public.is_admin());

-- set_logs: owned through the parent workout_log; the trainer reads their clients' sets.
create policy set_logs_client_all on public.set_logs
  for all to authenticated
  using (public.owns_workout_log(workout_log_id))
  with check (public.owns_workout_log(workout_log_id));
create policy set_logs_trainer_select on public.set_logs
  for select to authenticated using (public.can_read_workout_log(workout_log_id));
create policy set_logs_admin_all on public.set_logs
  for all to authenticated using (public.is_admin()) with check (public.is_admin());

-- personal_records: read-only to the client + trainer; only the security-definer trigger writes them.
create policy personal_records_client_select on public.personal_records
  for select to authenticated using (client_id = (select auth.uid()));
create policy personal_records_trainer_select on public.personal_records
  for select to authenticated using (public.is_trainer_of(client_id));
create policy personal_records_admin_all on public.personal_records
  for all to authenticated using (public.is_admin()) with check (public.is_admin());

-- P1-06 follow-up: a client can read their trainer's custom exercises (global + own already covered),
-- so the player doesn't 404 on a custom exercise in their program.
create policy exercises_select_client_of_trainer on public.exercises
  for select to authenticated using (public.is_client_of(trainer_id));

grant select, insert, update, delete on public.workout_logs to authenticated;
grant select, insert, update, delete on public.set_logs to authenticated;
grant select on public.personal_records to authenticated;
