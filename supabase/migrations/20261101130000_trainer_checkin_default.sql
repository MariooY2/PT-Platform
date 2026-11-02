-- P1-10: a trainer-level default weekly check-in weekday (Settings). checkin_schedules is client-keyed,
-- so the trainer default needs its own column on trainers. (0 = Sunday … 6 = Saturday, per JS getDay().)
alter table public.trainers
  add column default_checkin_weekday smallint
  check (default_checkin_weekday is null or default_checkin_weekday between 0 and 6);

-- 20261101025837_harden_rls_column_privileges.sql revoked blanket update on trainers and re-grants per
-- column; the trainers_update_own row policy already covers the row, so just grant this column.
grant update (default_checkin_weekday) on public.trainers to authenticated;

-- Make the per-client schedule a real key so set-weekday can never race into duplicate rows
-- (the client action is select-then-write; this keeps .maybeSingle() single-valued).
create unique index checkin_schedules_trainer_client_uq
  on public.checkin_schedules (trainer_id, client_id);
