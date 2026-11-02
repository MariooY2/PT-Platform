-- Security fix: a client's UPDATE of their own form_response could change trainer_id / form_id
-- (the client_update policy's WITH CHECK pinned only client_id), moving the row into another
-- trainer's tenant and review queue. Extend the existing non-trainer guard to pin every ownership
-- field from the old row, so a client fill can only ever write answers + submitted_at.
create or replace function public.guard_response_coach_fields()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  -- When the writer is not the owning trainer (i.e. the client filling their response), preserve the
  -- ownership + coach-only fields from the old row. The client can still write `answers` and flip
  -- `submitted_at` (checked by the client_update policy's USING submitted_at is null).
  if (select auth.uid()) is distinct from new.trainer_id then
    new.trainer_id := old.trainer_id;
    new.form_id := old.form_id;
    new.client_id := old.client_id;
    new.coach_reply := old.coach_reply;
    new.reviewed_at := old.reviewed_at;
  end if;
  return new;
end;
$$;
