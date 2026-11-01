-- Becoming a trainer is a controlled onboarding transition, not a self-service API insert.
-- Without this, any authenticated user (including a role='client' user) could insert their own
-- public.trainers row (id = auth.uid()) with storefront_published = true (verifier P0-02 A5).
-- Creating a trainers row is therefore service-role / security-definer only (P0-04 onboarding),
-- the same boundary as role/plan/client_id in 20261101025837_harden_rls_column_privileges.sql (D-010).

drop policy if exists trainers_insert_own on public.trainers;
revoke insert on public.trainers from authenticated;
