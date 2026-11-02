-- P1-06: assign a template to a client as an independent deep copy.
alter table public.programs add column start_date date;

-- Atomic deep copy programs -> program_workouts -> workout_exercises -> prescribed_sets, in one
-- function so a half-copy can never happen. security invoker: the caller's RLS applies — the trainer
-- can only read (and therefore copy) a template they own, and the programs insert policy pins
-- trainer_id = auth.uid(); we additionally require the target is one of the caller's active clients.
create or replace function public.copy_program_for_client(
  template_id uuid,
  target_client_id uuid,
  start_on date
)
returns uuid
language plpgsql
security invoker
set search_path = public
as $$
declare
  new_program_id uuid;
  w record;
  new_workout_id uuid;
  x record;
  new_wex_id uuid;
begin
  if not exists (
    select 1 from public.trainer_clients tc
    where tc.trainer_id = (select auth.uid())
      and tc.client_id = target_client_id
      and tc.status = 'active'
  ) then
    raise exception 'target is not an active client of the caller';
  end if;

  -- Insert the copy. The SELECT only returns the template if the caller can read it (owns it), and the
  -- programs WITH CHECK (trainer_id = auth.uid()) then pins ownership — so a foreign trainer gets no row.
  insert into public.programs
    (trainer_id, title, description, weeks, is_template, client_id, source_program_id, start_date, status)
  select trainer_id, title, description, weeks, false, target_client_id, id, start_on, 'draft'
  from public.programs
  where id = template_id and is_template = true
  returning id into new_program_id;

  if new_program_id is null then
    raise exception 'template not found or not editable by the caller';
  end if;

  for w in select * from public.program_workouts where program_id = template_id order by position loop
    insert into public.program_workouts (program_id, week, day, title, notes, position)
    values (new_program_id, w.week, w.day, w.title, w.notes, w.position)
    returning id into new_workout_id;

    for x in
      select * from public.workout_exercises where program_workout_id = w.id order by position
    loop
      insert into public.workout_exercises
        (program_workout_id, exercise_id, position, group_label, rest_seconds, tempo, notes)
      values
        (new_workout_id, x.exercise_id, x.position, x.group_label, x.rest_seconds, x.tempo, x.notes)
      returning id into new_wex_id;

      insert into public.prescribed_sets
        (workout_exercise_id, set_number, set_type, reps_min, reps_max, weight_kg, percent_1rm, rpe,
         rir, duration_sec, distance_m)
      select new_wex_id, set_number, set_type, reps_min, reps_max, weight_kg, percent_1rm, rpe,
             rir, duration_sec, distance_m
      from public.prescribed_sets where workout_exercise_id = x.id;
    end loop;
  end loop;

  return new_program_id;
end;
$$;

grant execute on function public.copy_program_for_client(uuid, uuid, date) to authenticated;
