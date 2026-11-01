-- Harden RLS against self-escalation (verifier P0-02 findings).
-- RLS controls which ROWS a user touches; these column privileges control which COLUMNS the
-- `authenticated` role may write. Privileged columns (profiles.role, trainers.plan,
-- trainer_clients.client_id) become service-role-only — set at signup / invite-accept by
-- security-definer server code (P0-04), never by a user via the API. Table-level INSERT/UPDATE
-- makes a column-level grant a no-op, so we revoke the table grant and re-grant columns explicitly.
-- SELECT and DELETE grants from the base migration are left intact.

-- profiles: a user may edit their display fields, but never their own `role`
-- (self-escalation to admin) nor the audit columns.
revoke insert, update on public.profiles from authenticated;
grant insert (id, full_name, phone, avatar_path, unit_system, timezone) on public.profiles to authenticated;
grant update (full_name, phone, avatar_path, unit_system, timezone) on public.profiles to authenticated;

-- trainers: a trainer may edit their storefront fields, but never their own `plan` (paid tier).
revoke insert, update on public.trainers from authenticated;
grant insert (id, slug, business_name, bio, certifications, brand_color, logo_path, instagram_handle, default_currency, storefront_published, payout_whish_phone) on public.trainers to authenticated;
grant update (slug, business_name, bio, certifications, brand_color, logo_path, instagram_handle, default_currency, storefront_published, payout_whish_phone) on public.trainers to authenticated;

-- trainer_clients: a trainer may create/manage invite rows, but never set `client_id`
-- (linking an arbitrary client to read their data). Linking is service-role / invite-accept only.
revoke insert, update on public.trainer_clients from authenticated;
grant insert (trainer_id, invite_email, invite_token, status, source, start_date, goals, injuries_notes, tags) on public.trainer_clients to authenticated;
grant update (invite_email, invite_token, status, source, start_date, goals, injuries_notes, tags) on public.trainer_clients to authenticated;
