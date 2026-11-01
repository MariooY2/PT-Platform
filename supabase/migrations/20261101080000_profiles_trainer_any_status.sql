-- D-020: a trainer keeps read access to a linked client's profile at ANY link status
-- (parallels D-019 for client_notes/client_files). is_trainer_of() matches only active/paused,
-- so archiving a client blanked their name/avatar in the coach UI ("Unnamed client"). Switch the
-- trainer profile-read policy to the any-status has_client_link() helper. Never edit a committed
-- migration — this replaces the policy created in the base schema with a new one.
drop policy profiles_select_trainer_of on public.profiles;
create policy profiles_select_trainer_of on public.profiles
  for select to authenticated using (public.has_client_link(id));
