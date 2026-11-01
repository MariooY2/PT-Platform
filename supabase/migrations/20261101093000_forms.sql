-- P1-03: forms, form_responses, checkin_schedules. docs/data-model.md §5, docs/security.md §6, features §7.7.

create type public.form_kind as enum ('intake', 'checkin');

create table public.forms (
  id uuid primary key default gen_random_uuid(),
  trainer_id uuid not null references public.trainers (id) on delete cascade,
  kind public.form_kind not null,
  title text not null,
  questions jsonb not null default '[]'::jsonb,
  is_default boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index forms_trainer_idx on public.forms (trainer_id);
create trigger forms_set_updated_at
  before update on public.forms
  for each row execute function public.set_updated_at();

create table public.form_responses (
  id uuid primary key default gen_random_uuid(),
  form_id uuid not null references public.forms (id) on delete cascade,
  trainer_id uuid not null references public.trainers (id) on delete cascade,
  client_id uuid not null references public.profiles (id) on delete cascade,
  due_date date,
  answers jsonb not null default '{}'::jsonb,
  submitted_at timestamptz,
  coach_reply text,
  reviewed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index form_responses_trainer_idx on public.form_responses (trainer_id, reviewed_at);
create index form_responses_client_idx on public.form_responses (client_id);
create trigger form_responses_set_updated_at
  before update on public.form_responses
  for each row execute function public.set_updated_at();

create table public.checkin_schedules (
  id uuid primary key default gen_random_uuid(),
  trainer_id uuid not null references public.trainers (id) on delete cascade,
  client_id uuid not null references public.profiles (id) on delete cascade,
  form_id uuid not null references public.forms (id) on delete cascade,
  weekday int not null check (weekday between 0 and 6),
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index checkin_schedules_trainer_client_idx on public.checkin_schedules (trainer_id, client_id);
create trigger checkin_schedules_set_updated_at
  before update on public.checkin_schedules
  for each row execute function public.set_updated_at();

-- "Is this trainer my trainer?" — the client's side of the link (any status so an archived client
-- can still read their intake). security definer to bypass RLS on trainer_clients.
create or replace function public.is_client_of(trainer uuid)
returns boolean
language sql
security definer
stable
set search_path = public
as $$
  select exists (
    select 1 from public.trainer_clients tc
    where tc.client_id = (select auth.uid()) and tc.trainer_id = trainer
  );
$$;

-- Every trainer gets a default intake + weekly check-in form. Fires on trainers insert, so the
-- seeded trainers (inserted by seed.sql after this migration) get them too.
create or replace function public.create_default_forms()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.forms (trainer_id, kind, title, is_default, questions) values
    (new.id, 'intake', 'Intake', true, '[
      {"id":"goals","type":"long_text","label":"What are your main goals?","required":true},
      {"id":"experience","type":"choice","label":"Training experience","required":true,"options":["Beginner","Intermediate","Advanced"]},
      {"id":"injuries","type":"long_text","label":"Any injuries or limitations?","required":false},
      {"id":"days","type":"number","label":"Days per week you can train","required":true},
      {"id":"weight","type":"weight","label":"Current body weight","required":false}
    ]'::jsonb),
    (new.id, 'checkin', 'Weekly check-in', true, '[
      {"id":"weight","type":"weight","label":"Body weight this week","required":false},
      {"id":"energy","type":"scale","label":"Energy level (1–10)","required":true},
      {"id":"sleep","type":"scale","label":"Sleep quality (1–10)","required":true},
      {"id":"adherence","type":"long_text","label":"How did training and nutrition go?","required":false},
      {"id":"photo","type":"photo","label":"Progress photo (optional)","required":false}
    ]'::jsonb);
  return new;
end;
$$;
create trigger trainers_default_forms
  after insert on public.trainers
  for each row execute function public.create_default_forms();

-- A non-trainer update (i.e. the client filling their response) can never change the coach-only
-- fields; preserve them from the old row.
create or replace function public.guard_response_coach_fields()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if (select auth.uid()) is distinct from new.trainer_id then
    new.coach_reply := old.coach_reply;
    new.reviewed_at := old.reviewed_at;
  end if;
  return new;
end;
$$;
create trigger form_responses_guard_coach_fields
  before update on public.form_responses
  for each row execute function public.guard_response_coach_fields();

alter table public.forms enable row level security;
alter table public.form_responses enable row level security;
alter table public.checkin_schedules enable row level security;

-- forms: trainer owns theirs; a client reads their trainer's forms.
create policy forms_trainer_all on public.forms
  for all to authenticated
  using (trainer_id = (select auth.uid()))
  with check (trainer_id = (select auth.uid()));
create policy forms_client_select on public.forms
  for select to authenticated using (public.is_client_of(trainer_id));
create policy forms_admin_all on public.forms
  for all to authenticated using (public.is_admin()) with check (public.is_admin());

-- form_responses: trainer reads/manages all of theirs; client reads own and may UPDATE own only
-- while unsubmitted (the coach-field guard trigger stops the client touching coach_reply/reviewed_at).
create policy form_responses_trainer_all on public.form_responses
  for all to authenticated
  using (trainer_id = (select auth.uid()))
  with check (trainer_id = (select auth.uid()));
create policy form_responses_client_select on public.form_responses
  for select to authenticated using (client_id = (select auth.uid()));
-- The client creates their own (unsubmitted) response for their trainer (e.g. the intake on first login).
create policy form_responses_client_insert on public.form_responses
  for insert to authenticated
  with check (
    client_id = (select auth.uid())
    and public.is_client_of(trainer_id)
    and submitted_at is null
  );
create policy form_responses_client_update on public.form_responses
  for update to authenticated
  using (client_id = (select auth.uid()) and submitted_at is null)
  with check (client_id = (select auth.uid()));
create policy form_responses_admin_all on public.form_responses
  for all to authenticated using (public.is_admin()) with check (public.is_admin());

-- checkin_schedules: trainer-only.
create policy checkin_schedules_trainer_all on public.checkin_schedules
  for all to authenticated
  using (trainer_id = (select auth.uid()))
  with check (trainer_id = (select auth.uid()));
create policy checkin_schedules_admin_all on public.checkin_schedules
  for all to authenticated using (public.is_admin()) with check (public.is_admin());

grant select, insert, update, delete on public.forms to authenticated;
grant select, insert, update, delete on public.form_responses to authenticated;
grant select, insert, update, delete on public.checkin_schedules to authenticated;
