-- P1-02: give invite_expires_at a default so app-created invites aren't born expired (D-015).
-- Column was added in 20261101045221 with no default and no authenticated INSERT grant, so the
-- invite-creation server action (session client) can't set it; /invite/[token] treats null as expired.
alter table public.trainer_clients
  alter column invite_expires_at set default (now() + interval '14 days');
