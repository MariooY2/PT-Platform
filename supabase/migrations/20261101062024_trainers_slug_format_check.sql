-- Enforce slug FORMAT in the database (uniqueness was already enforced). Mirrors the Zod slugSchema
-- so a trainer cannot bypass validation with a direct REST PATCH of their own trainers.slug
-- (verifier P0-04 A5). 3–40 chars, lowercase letters/digits/hyphens, starts and ends alphanumeric.
alter table public.trainers
  add constraint trainers_slug_format check (slug ~ '^[a-z0-9][a-z0-9-]{1,38}[a-z0-9]$');
