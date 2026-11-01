-- Auth: create the profile row on signup, and give invites a 14-day expiry.

-- Role comes from auth.users.raw_app_meta_data->>'role', which is admin-write-only (set by the signup
-- server action via the service key). A browser cannot supply app_metadata, so role is never
-- client-controlled (P0-04 A5). Defaults to 'client'. full_name comes from user_metadata.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, role, full_name)
  values (
    new.id,
    coalesce(new.raw_app_meta_data ->> 'role', 'client')::public.user_role,
    new.raw_user_meta_data ->> 'full_name'
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- Invites expire after 14 days and are consumed once (the server nulls invite_token on accept).
alter table public.trainer_clients
  add column invite_expires_at timestamptz;
