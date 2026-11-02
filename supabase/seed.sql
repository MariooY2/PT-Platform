-- Seed: 1 admin, 3 trainers (one with no clients), 2 clients, with trainer_clients links.
-- Password for every seeded account: Password123!
-- Fixed UUIDs so tests and UI seed-logins are deterministic.
-- role lives in raw_app_meta_data (admin-only, read by middleware and the handle_new_user trigger).

insert into auth.users (
  instance_id, id, aud, role, email, encrypted_password,
  email_confirmed_at, raw_app_meta_data, raw_user_meta_data,
  created_at, updated_at,
  confirmation_token, recovery_token, email_change_token_new, email_change
)
values
  ('00000000-0000-0000-0000-000000000000', 'aaaaaaaa-0000-0000-0000-000000000001', 'authenticated', 'authenticated', 'admin@ptplatform.test',     extensions.crypt('Password123!', extensions.gen_salt('bf')), now(), '{"provider":"email","providers":["email"],"role":"admin"}',   '{"full_name":"Platform Admin"}', now(), now(), '', '', '', ''),
  ('00000000-0000-0000-0000-000000000000', '11111111-0000-0000-0000-000000000001', 'authenticated', 'authenticated', 'trainer.a@ptplatform.test', extensions.crypt('Password123!', extensions.gen_salt('bf')), now(), '{"provider":"email","providers":["email"],"role":"trainer"}', '{"full_name":"Trainer Alpha"}', now(), now(), '', '', '', ''),
  ('00000000-0000-0000-0000-000000000000', '22222222-0000-0000-0000-000000000001', 'authenticated', 'authenticated', 'trainer.b@ptplatform.test', extensions.crypt('Password123!', extensions.gen_salt('bf')), now(), '{"provider":"email","providers":["email"],"role":"trainer"}', '{"full_name":"Trainer Beta"}',  now(), now(), '', '', '', ''),
  ('00000000-0000-0000-0000-000000000000', '55555555-0000-0000-0000-000000000001', 'authenticated', 'authenticated', 'coach.empty@ptplatform.test', extensions.crypt('Password123!', extensions.gen_salt('bf')), now(), '{"provider":"email","providers":["email"],"role":"trainer"}', '{"full_name":"Coach Empty"}',  now(), now(), '', '', '', ''),
  ('00000000-0000-0000-0000-000000000000', '33333333-0000-0000-0000-000000000001', 'authenticated', 'authenticated', 'client.one@ptplatform.test', extensions.crypt('Password123!', extensions.gen_salt('bf')), now(), '{"provider":"email","providers":["email"],"role":"client"}',  '{"full_name":"Client One"}',   now(), now(), '', '', '', ''),
  ('00000000-0000-0000-0000-000000000000', '44444444-0000-0000-0000-000000000001', 'authenticated', 'authenticated', 'client.two@ptplatform.test', extensions.crypt('Password123!', extensions.gen_salt('bf')), now(), '{"provider":"email","providers":["email"],"role":"client"}',  '{"full_name":"Client Two"}',   now(), now(), '', '', '', '');

-- auth.identities: email provider rows (identity_data must carry sub + email).
insert into auth.identities (
  id, user_id, provider_id, identity_data, provider, last_sign_in_at, created_at, updated_at
)
select
  extensions.gen_random_uuid(), u.id, u.id::text,
  jsonb_build_object('sub', u.id::text, 'email', u.email, 'email_verified', true),
  'email', now(), now(), now()
from auth.users u
where u.email like '%@ptplatform.test';

-- profiles: the handle_new_user trigger already created these from app_metadata.role; upsert to be explicit.
insert into public.profiles (id, role, full_name) values
  ('aaaaaaaa-0000-0000-0000-000000000001', 'admin',   'Platform Admin'),
  ('11111111-0000-0000-0000-000000000001', 'trainer', 'Trainer Alpha'),
  ('22222222-0000-0000-0000-000000000001', 'trainer', 'Trainer Beta'),
  ('55555555-0000-0000-0000-000000000001', 'trainer', 'Coach Empty'),
  ('33333333-0000-0000-0000-000000000001', 'client',  'Client One'),
  ('44444444-0000-0000-0000-000000000001', 'client',  'Client Two')
on conflict (id) do update set role = excluded.role, full_name = excluded.full_name;

-- trainers (Coach Empty has a storefront but no clients — the 'coach-empty' seed account)
insert into public.trainers (id, slug, business_name, default_currency, plan, storefront_published) values
  ('11111111-0000-0000-0000-000000000001', 'trainer-alpha', 'Alpha Strength', 'USD', 'pro',  true),
  ('22222222-0000-0000-0000-000000000001', 'trainer-beta',  'Beta Fitness',   'USD', 'free', false),
  ('55555555-0000-0000-0000-000000000001', 'coach-empty',   'Coach Empty',    'USD', 'free', false);

-- trainer_clients: Alpha→Client One, Beta→Client Two (active), plus one invited lead for Alpha (valid 14 days).
insert into public.trainer_clients (trainer_id, client_id, status, source, start_date) values
  ('11111111-0000-0000-0000-000000000001', '33333333-0000-0000-0000-000000000001', 'active', 'invite', now()::date),
  ('22222222-0000-0000-0000-000000000001', '44444444-0000-0000-0000-000000000001', 'active', 'invite', now()::date);

insert into public.trainer_clients (trainer_id, invite_email, invite_token, status, source, invite_expires_at) values
  ('11111111-0000-0000-0000-000000000001', 'lead@ptplatform.test', 'seed-invite-token-alpha', 'invited', 'invite', now() + interval '14 days');

-- Global exercise library (trainer_id null). Values use src/features/exercises/taxonomy.ts (P1-04).
insert into public.exercises (name, primary_muscle, secondary_muscles, equipment, category) values
  ('Barbell bench press', 'chest', array['triceps','shoulders'], 'barbell', 'strength'),
  ('Incline barbell bench press', 'chest', array['shoulders','triceps'], 'barbell', 'strength'),
  ('Decline barbell bench press', 'chest', array['triceps'], 'barbell', 'strength'),
  ('Dumbbell bench press', 'chest', array['triceps','shoulders'], 'dumbbell', 'strength'),
  ('Incline dumbbell press', 'chest', array['shoulders','triceps'], 'dumbbell', 'strength'),
  ('Dumbbell fly', 'chest', array['shoulders'], 'dumbbell', 'strength'),
  ('Cable fly', 'chest', array['shoulders'], 'cable', 'strength'),
  ('Machine chest press', 'chest', array['triceps'], 'machine', 'strength'),
  ('Pec deck', 'chest', '{}', 'machine', 'strength'),
  ('Push-up', 'chest', array['triceps','core'], 'bodyweight', 'strength'),
  ('Machine incline press', 'chest', array['shoulders'], 'machine', 'strength'),
  ('Svend press', 'chest', '{}', 'plate', 'strength'),
  ('Bent-over barbell row', 'back', array['lats','biceps'], 'barbell', 'strength'),
  ('Pendlay row', 'back', array['lats','traps'], 'barbell', 'strength'),
  ('Seated cable row', 'back', array['lats','biceps'], 'cable', 'strength'),
  ('T-bar row', 'back', array['lats','traps'], 'machine', 'strength'),
  ('Single-arm dumbbell row', 'back', array['lats','biceps'], 'dumbbell', 'strength'),
  ('Chest-supported row', 'back', array['lats'], 'machine', 'strength'),
  ('Inverted row', 'back', array['biceps','core'], 'bodyweight', 'strength'),
  ('Rack pull', 'back', array['traps','glutes'], 'barbell', 'strength'),
  ('Meadows row', 'back', array['lats'], 'barbell', 'strength'),
  ('Seal row', 'back', array['lats'], 'dumbbell', 'strength'),
  ('Pull-up', 'lats', array['biceps','back'], 'bodyweight', 'strength'),
  ('Chin-up', 'lats', array['biceps'], 'bodyweight', 'strength'),
  ('Lat pulldown', 'lats', array['biceps'], 'cable', 'strength'),
  ('Wide-grip pulldown', 'lats', array['back'], 'cable', 'strength'),
  ('Straight-arm pulldown', 'lats', '{}', 'cable', 'strength'),
  ('Machine pullover', 'lats', array['chest'], 'machine', 'strength'),
  ('Barbell shrug', 'traps', '{}', 'barbell', 'strength'),
  ('Dumbbell shrug', 'traps', '{}', 'dumbbell', 'strength'),
  ('Face pull', 'traps', array['shoulders'], 'cable', 'strength'),
  ('Upright row', 'traps', array['shoulders'], 'barbell', 'strength'),
  ('Farmer''s carry', 'traps', array['forearms','core'], 'dumbbell', 'other'),
  ('Overhead press', 'shoulders', array['triceps'], 'barbell', 'strength'),
  ('Seated dumbbell press', 'shoulders', array['triceps'], 'dumbbell', 'strength'),
  ('Arnold press', 'shoulders', array['triceps'], 'dumbbell', 'strength'),
  ('Lateral raise', 'shoulders', '{}', 'dumbbell', 'strength'),
  ('Cable lateral raise', 'shoulders', '{}', 'cable', 'strength'),
  ('Front raise', 'shoulders', '{}', 'dumbbell', 'strength'),
  ('Rear delt fly', 'shoulders', array['traps'], 'dumbbell', 'strength'),
  ('Machine shoulder press', 'shoulders', array['triceps'], 'machine', 'strength'),
  ('Landmine press', 'shoulders', array['triceps','chest'], 'barbell', 'strength'),
  ('Dumbbell Z press', 'shoulders', array['core','triceps'], 'dumbbell', 'strength'),
  ('Machine lateral raise', 'shoulders', '{}', 'machine', 'strength'),
  ('Barbell curl', 'biceps', array['forearms'], 'barbell', 'strength'),
  ('EZ-bar curl', 'biceps', array['forearms'], 'ez_bar', 'strength'),
  ('Dumbbell curl', 'biceps', array['forearms'], 'dumbbell', 'strength'),
  ('Hammer curl', 'biceps', array['forearms'], 'dumbbell', 'strength'),
  ('Incline dumbbell curl', 'biceps', '{}', 'dumbbell', 'strength'),
  ('Preacher curl', 'biceps', '{}', 'ez_bar', 'strength'),
  ('Cable curl', 'biceps', array['forearms'], 'cable', 'strength'),
  ('Concentration curl', 'biceps', '{}', 'dumbbell', 'strength'),
  ('Close-grip bench press', 'triceps', array['chest','shoulders'], 'barbell', 'strength'),
  ('Triceps pushdown', 'triceps', '{}', 'cable', 'strength'),
  ('Overhead cable extension', 'triceps', '{}', 'cable', 'strength'),
  ('Skullcrusher', 'triceps', '{}', 'ez_bar', 'strength'),
  ('Dumbbell overhead extension', 'triceps', '{}', 'dumbbell', 'strength'),
  ('Dips', 'triceps', array['chest','shoulders'], 'bodyweight', 'strength'),
  ('Rope pushdown', 'triceps', '{}', 'cable', 'strength'),
  ('Bench dip', 'triceps', array['chest'], 'bodyweight', 'strength'),
  ('Wrist curl', 'forearms', '{}', 'barbell', 'strength'),
  ('Reverse wrist curl', 'forearms', '{}', 'barbell', 'strength'),
  ('Reverse barbell curl', 'forearms', array['biceps'], 'barbell', 'strength'),
  ('Plate pinch', 'forearms', '{}', 'plate', 'strength'),
  ('Plank', 'core', '{}', 'bodyweight', 'strength'),
  ('Side plank', 'core', '{}', 'bodyweight', 'strength'),
  ('Hanging leg raise', 'core', array['forearms'], 'bodyweight', 'strength'),
  ('Cable crunch', 'core', '{}', 'cable', 'strength'),
  ('Ab wheel rollout', 'core', array['shoulders'], 'bodyweight', 'strength'),
  ('Russian twist', 'core', '{}', 'medicine_ball', 'strength'),
  ('Bicycle crunch', 'core', '{}', 'bodyweight', 'strength'),
  ('Dead bug', 'core', '{}', 'bodyweight', 'strength'),
  ('Hollow hold', 'core', '{}', 'bodyweight', 'strength'),
  ('Mountain climber', 'core', array['shoulders'], 'bodyweight', 'cardio'),
  ('Sit-up', 'core', '{}', 'bodyweight', 'strength'),
  ('Pallof press', 'core', '{}', 'cable', 'strength'),
  ('Toe touch', 'core', '{}', 'bodyweight', 'strength'),
  ('Cable woodchopper', 'core', array['shoulders'], 'cable', 'strength'),
  ('Back squat', 'quads', array['glutes','core'], 'barbell', 'strength'),
  ('Front squat', 'quads', array['core','glutes'], 'barbell', 'strength'),
  ('Leg press', 'quads', array['glutes'], 'machine', 'strength'),
  ('Hack squat', 'quads', array['glutes'], 'machine', 'strength'),
  ('Goblet squat', 'quads', array['glutes','core'], 'kettlebell', 'strength'),
  ('Bulgarian split squat', 'quads', array['glutes'], 'dumbbell', 'strength'),
  ('Walking lunge', 'quads', array['glutes'], 'dumbbell', 'strength'),
  ('Leg extension', 'quads', '{}', 'machine', 'strength'),
  ('Step-up', 'quads', array['glutes'], 'dumbbell', 'strength'),
  ('Smith machine squat', 'quads', array['glutes'], 'smith_machine', 'strength'),
  ('Sissy squat', 'quads', '{}', 'bodyweight', 'strength'),
  ('Box squat', 'quads', array['glutes'], 'barbell', 'strength'),
  ('Zercher squat', 'quads', array['core','glutes'], 'barbell', 'strength'),
  ('Pistol squat', 'quads', array['glutes','core'], 'bodyweight', 'strength'),
  ('Romanian deadlift', 'hamstrings', array['glutes','back'], 'barbell', 'strength'),
  ('Conventional deadlift', 'hamstrings', array['glutes','back'], 'barbell', 'strength'),
  ('Lying leg curl', 'hamstrings', '{}', 'machine', 'strength'),
  ('Seated leg curl', 'hamstrings', '{}', 'machine', 'strength'),
  ('Good morning', 'hamstrings', array['glutes','back'], 'barbell', 'strength'),
  ('Nordic curl', 'hamstrings', '{}', 'bodyweight', 'strength'),
  ('Stiff-leg deadlift', 'hamstrings', array['glutes'], 'barbell', 'strength'),
  ('Glute-ham raise', 'hamstrings', array['glutes'], 'machine', 'strength'),
  ('Hip thrust', 'glutes', array['hamstrings'], 'barbell', 'strength'),
  ('Barbell glute bridge', 'glutes', array['hamstrings'], 'barbell', 'strength'),
  ('Cable kickback', 'glutes', '{}', 'cable', 'strength'),
  ('Sumo deadlift', 'glutes', array['hamstrings','adductors'], 'barbell', 'strength'),
  ('Kettlebell swing', 'glutes', array['hamstrings','core'], 'kettlebell', 'strength'),
  ('Reverse lunge', 'glutes', array['quads'], 'dumbbell', 'strength'),
  ('Cable pull-through', 'glutes', array['hamstrings'], 'cable', 'strength'),
  ('Single-leg hip thrust', 'glutes', array['hamstrings'], 'bodyweight', 'strength'),
  ('Curtsy lunge', 'glutes', array['quads','adductors'], 'dumbbell', 'strength'),
  ('Standing calf raise', 'calves', '{}', 'machine', 'strength'),
  ('Seated calf raise', 'calves', '{}', 'machine', 'strength'),
  ('Leg press calf raise', 'calves', '{}', 'machine', 'strength'),
  ('Donkey calf raise', 'calves', '{}', 'machine', 'strength'),
  ('Single-leg calf raise', 'calves', '{}', 'bodyweight', 'strength'),
  ('Adductor machine', 'adductors', '{}', 'machine', 'strength'),
  ('Cossack squat', 'adductors', array['quads','glutes'], 'bodyweight', 'strength'),
  ('Copenhagen plank', 'adductors', array['core'], 'bodyweight', 'strength'),
  ('Clean and press', 'full_body', array['shoulders','quads','back'], 'barbell', 'strength'),
  ('Thruster', 'full_body', array['quads','shoulders'], 'barbell', 'strength'),
  ('Burpee', 'full_body', array['chest','quads','core'], 'bodyweight', 'plyometric'),
  ('Turkish get-up', 'full_body', array['core','shoulders'], 'kettlebell', 'other'),
  ('Bear crawl', 'full_body', array['core','shoulders'], 'bodyweight', 'other'),
  ('Sled push', 'full_body', array['quads','glutes'], 'machine', 'other'),
  ('Treadmill run', 'full_body', '{}', 'machine', 'cardio'),
  ('Rowing machine', 'full_body', array['back','quads'], 'machine', 'cardio'),
  ('Assault bike', 'full_body', '{}', 'machine', 'cardio'),
  ('Stationary bike', 'quads', '{}', 'machine', 'cardio'),
  ('Jump rope', 'calves', array['shoulders'], 'bodyweight', 'cardio'),
  ('Stair climber', 'glutes', array['quads'], 'machine', 'cardio'),
  ('Elliptical', 'full_body', '{}', 'machine', 'cardio'),
  ('Battle ropes', 'shoulders', array['core'], 'band', 'cardio'),
  ('Ski erg', 'full_body', array['back','core'], 'machine', 'cardio'),
  ('Swimming', 'full_body', '{}', 'bodyweight', 'cardio'),
  ('Cat-cow', 'core', array['back'], 'bodyweight', 'mobility'),
  ('World''s greatest stretch', 'full_body', '{}', 'bodyweight', 'mobility'),
  ('Hip flexor stretch', 'quads', array['glutes'], 'bodyweight', 'mobility'),
  ('Thoracic rotation', 'back', '{}', 'bodyweight', 'mobility'),
  ('Shoulder dislocate', 'shoulders', '{}', 'band', 'mobility'),
  ('90/90 hip switch', 'glutes', array['adductors'], 'bodyweight', 'mobility'),
  ('Couch stretch', 'quads', '{}', 'bodyweight', 'mobility'),
  ('Box jump', 'quads', array['glutes','calves'], 'bodyweight', 'plyometric'),
  ('Broad jump', 'quads', array['glutes'], 'bodyweight', 'plyometric'),
  ('Jump squat', 'quads', array['glutes'], 'bodyweight', 'plyometric'),
  ('Depth jump', 'quads', array['calves'], 'bodyweight', 'plyometric'),
  ('Clap push-up', 'chest', array['triceps'], 'bodyweight', 'plyometric'),
  ('Tuck jump', 'quads', array['core'], 'bodyweight', 'plyometric');

-- Sample template program for Trainer Alpha (P1-05; the Programs empty state references a sample).
insert into public.programs (id, trainer_id, title, description, weeks, is_template, status) values
  ('bbbb0000-0000-0000-0000-000000000001', '11111111-0000-0000-0000-000000000001', 'Sample 3-Day Strength', 'A starter template you can duplicate.', 4, true, 'published');
insert into public.program_workouts (id, program_id, week, day, title, position) values
  ('bbbb0000-0000-0000-0000-000000000002', 'bbbb0000-0000-0000-0000-000000000001', 1, 1, 'Lower A', 0);
insert into public.workout_exercises (id, program_workout_id, exercise_id, position) values
  ('bbbb0000-0000-0000-0000-000000000003', 'bbbb0000-0000-0000-0000-000000000002', (select id from public.exercises where trainer_id is null and name = 'Back squat' limit 1), 0);
insert into public.prescribed_sets (workout_exercise_id, set_number, set_type, reps_min, reps_max, weight_kg) values
  ('bbbb0000-0000-0000-0000-000000000003', 1, 'working', 5, 5, 80);

-- P1-06: one assigned copy of the sample template for Client One, so the Programs "Client copies" tab
-- and the "Used by (n)" count have a default-state screenshot. A direct deep copy (seed has no auth
-- context to call copy_program_for_client); mirrors the template's one workout → exercise → set.
insert into public.programs (id, trainer_id, title, description, weeks, is_template, client_id, source_program_id, start_date, status) values
  ('bbbb0000-0000-0000-0000-000000000011', '11111111-0000-0000-0000-000000000001', 'Sample 3-Day Strength', 'A starter template you can duplicate.', 4, false, '33333333-0000-0000-0000-000000000001', 'bbbb0000-0000-0000-0000-000000000001', current_date, 'published');
insert into public.program_workouts (id, program_id, week, day, title, position) values
  ('bbbb0000-0000-0000-0000-000000000012', 'bbbb0000-0000-0000-0000-000000000011', 1, 1, 'Lower A', 0);
insert into public.workout_exercises (id, program_workout_id, exercise_id, position) values
  ('bbbb0000-0000-0000-0000-000000000013', 'bbbb0000-0000-0000-0000-000000000012', (select id from public.exercises where trainer_id is null and name = 'Back squat' limit 1), 0);
insert into public.prescribed_sets (workout_exercise_id, set_number, set_type, reps_min, reps_max, weight_kg) values
  ('bbbb0000-0000-0000-0000-000000000013', 1, 'working', 5, 5, 80);

-- P1-07: one completed Back-squat workout for Client One a week ago, so the player's "previous
-- performance" and the Progress screen have real data. Today's assigned day-1 workout stays unlogged
-- (start_date = current_date), so /client Today shows the scheduled workout ready to start.
insert into public.workout_logs (id, trainer_id, client_id, assignment_id, program_workout_id, scheduled_date, started_at, completed_at, status, session_rpe, client_generated_id) values
  ('dddd0000-0000-0000-0000-000000000001', '11111111-0000-0000-0000-000000000001', '33333333-0000-0000-0000-000000000001', 'bbbb0000-0000-0000-0000-000000000011', 'bbbb0000-0000-0000-0000-000000000012', current_date - 7, now() - interval '7 days', now() - interval '7 days' + interval '45 minutes', 'completed', 8, 'dddd0000-0000-0000-0000-000000000011');
insert into public.set_logs (workout_log_id, workout_exercise_id, exercise_id, set_number, reps, weight_kg, completed, client_generated_id)
select 'dddd0000-0000-0000-0000-000000000001', 'bbbb0000-0000-0000-0000-000000000013', e.id, v.set_number, v.reps, v.weight_kg, true, v.cgid
from (values
  (1, 5, 80.0, 'dddd0000-0000-0000-0000-000000000021'::uuid),
  (2, 5, 80.0, 'dddd0000-0000-0000-0000-000000000022'::uuid),
  (3, 5, 82.5, 'dddd0000-0000-0000-0000-000000000023'::uuid)
) as v(set_number, reps, weight_kg, cgid)
cross join (select id from public.exercises where trainer_id is null and name = 'Back squat' limit 1) e;

-- P1-03: Client One finished Alpha's intake (so the intake gate lets them through and existing
-- /client* routes + nav/pwa specs keep working); plus one submitted, unreviewed weekly check-in so
-- /coach/checkins has a populated default state. Client Two is left WITHOUT an intake on purpose so
-- A4's e2e has a fresh, un-onboarded client that no existing ui-route depends on.
insert into public.form_responses (form_id, trainer_id, client_id, answers, submitted_at, reviewed_at)
select f.id, f.trainer_id, '33333333-0000-0000-0000-000000000001',
  '{"goals":"Build strength","experience":"Intermediate","days":3}'::jsonb,
  now() - interval '20 days', now() - interval '19 days'
from public.forms f
where f.trainer_id = '11111111-0000-0000-0000-000000000001' and f.kind = 'intake' and f.is_default;

insert into public.form_responses (id, form_id, trainer_id, client_id, answers, submitted_at)
select 'cccc0000-0000-0000-0000-000000000002', f.id, f.trainer_id, '33333333-0000-0000-0000-000000000001',
  '{"weight":71.4,"energy":6,"sleep":7,"adherence":"Good week"}'::jsonb,
  now() - interval '2 days'
from public.forms f
where f.trainer_id = '11111111-0000-0000-0000-000000000001' and f.kind = 'checkin' and f.is_default;

-- One UNSUBMITTED weekly check-in for Client One with a fixed id, so the mobile check-in fill screen
-- (/client/checkin/[id], one question per screen) has a capturable ui-route for screenshots + axe (A6).
-- This route sits outside the (app) intake gate, so it renders without the bottom-nav shell; Client One's
-- intake stays submitted so /client itself still renders. cccc…0002 above is the submitted reply view.
insert into public.form_responses (id, form_id, trainer_id, client_id, answers)
select 'cccc0000-0000-0000-0000-000000000001', f.id, f.trainer_id, '33333333-0000-0000-0000-000000000001',
  '{}'::jsonb
from public.forms f
where f.trainer_id = '11111111-0000-0000-0000-000000000001' and f.kind = 'checkin' and f.is_default;
