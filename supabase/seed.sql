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
