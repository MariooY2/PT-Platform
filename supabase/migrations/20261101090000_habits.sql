-- P1-09: habits (coach-defined) and habit_logs (client ticks). docs/data-model.md §5, docs/security.md §6.

create table public.habits (
  id uuid primary key default gen_random_uuid(),
  trainer_id uuid not null references public.trainers (id) on delete cascade,
  client_id uuid not null references public.profiles (id) on delete cascade,
  name text not null,
  target_value numeric,
  unit text,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index habits_trainer_client_idx on public.habits (trainer_id, client_id);
create trigger habits_set_updated_at
  before update on public.habits
  for each row execute function public.set_updated_at();

create table public.habit_logs (
  id uuid primary key default gen_random_uuid(),
  habit_id uuid not null references public.habits (id) on delete cascade,
  client_id uuid not null references public.profiles (id) on delete cascade,
  log_date date not null,
  value numeric,
  created_at timestamptz not null default now(),
  unique (habit_id, log_date)
);
create index habit_logs_client_date_idx on public.habit_logs (client_id, log_date);

-- A client may log only against a habit that is theirs (prevents squatting another client's
-- (habit_id, log_date) unique slot). security definer so it bypasses RLS on habits.
create or replace function public.owns_habit(habit uuid)
returns boolean
language sql
security definer
stable
set search_path = public
as $$
  select exists (
    select 1 from public.habits h where h.id = habit and h.client_id = (select auth.uid())
  );
$$;

alter table public.habits enable row level security;
alter table public.habit_logs enable row level security;

-- habits: the trainer manages habits for their (active/paused) clients; the client reads their own.
create policy habits_trainer_all on public.habits
  for all to authenticated
  using (trainer_id = (select auth.uid()) and public.is_trainer_of(client_id))
  with check (trainer_id = (select auth.uid()) and public.is_trainer_of(client_id));
create policy habits_client_select on public.habits
  for select to authenticated using (client_id = (select auth.uid()));
create policy habits_admin_all on public.habits
  for all to authenticated using (public.is_admin()) with check (public.is_admin());

-- habit_logs: the client owns their logs (only for their own habits); the trainer reads their clients'.
create policy habit_logs_client_all on public.habit_logs
  for all to authenticated
  using (client_id = (select auth.uid()))
  with check (client_id = (select auth.uid()) and public.owns_habit(habit_id));
create policy habit_logs_trainer_select on public.habit_logs
  for select to authenticated using (public.is_trainer_of(client_id));
create policy habit_logs_admin_all on public.habit_logs
  for all to authenticated using (public.is_admin()) with check (public.is_admin());

grant select, insert, update, delete on public.habits to authenticated;
grant select, insert, update, delete on public.habit_logs to authenticated;
