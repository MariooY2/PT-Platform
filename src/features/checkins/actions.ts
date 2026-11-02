'use server';

import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';
import { roleOf } from '@/lib/supabase/middleware';
import { setClientCheckinSchema, weekdaySchema } from './schemas';
import { defaultCheckinFormId } from './queries';

export type ActionResult = { ok: true } | { ok: false; error: string };

const SESSION_EXPIRED = 'Your session expired. Sign in and try again.';
const COACH_ONLY = 'Only coaches can set check-in days.';

/**
 * Set (or change) a client's weekly check-in day. The weekday comes from the form; the trainer and
 * client ids and the check-in form are resolved server-side from the session and never trusted from
 * the browser. Writes `checkin_schedules` (trainer-only under RLS).
 */
export async function setClientCheckinWeekdayAction(
  clientId: string,
  weekday: number,
): Promise<ActionResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: SESSION_EXPIRED };
  if (roleOf(user) !== 'trainer') return { ok: false, error: COACH_ONLY };

  const parsed = setClientCheckinSchema.safeParse({ clientId, weekday });
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? 'Check the day and try again.' };
  }

  // The client must be linked to this trainer (any status) before we schedule them.
  const { data: link } = await supabase
    .from('trainer_clients')
    .select('client_id')
    .eq('trainer_id', user.id)
    .eq('client_id', parsed.data.clientId)
    .maybeSingle();
  if (!link) return { ok: false, error: 'We couldn’t find that client.' };

  const formId = await defaultCheckinFormId(supabase, user.id);
  if (!formId) return { ok: false, error: 'You don’t have a check-in form yet.' };

  // No unique constraint on (trainer_id, client_id), so upsert explicitly: update the existing row
  // or insert a new one.
  const { data: existing } = await supabase
    .from('checkin_schedules')
    .select('id')
    .eq('trainer_id', user.id)
    .eq('client_id', parsed.data.clientId)
    .maybeSingle();

  if (existing) {
    const { error } = await supabase
      .from('checkin_schedules')
      .update({ weekday: parsed.data.weekday, form_id: formId, active: true })
      .eq('id', existing.id)
      .eq('trainer_id', user.id);
    if (error) return { ok: false, error: 'We couldn’t save the check-in day. Try again.' };
  } else {
    const { error } = await supabase.from('checkin_schedules').insert({
      trainer_id: user.id,
      client_id: parsed.data.clientId,
      form_id: formId,
      weekday: parsed.data.weekday,
      active: true,
    });
    if (error) return { ok: false, error: 'We couldn’t save the check-in day. Try again.' };
  }

  revalidatePath(`/coach/clients/${parsed.data.clientId}`);
  return { ok: true };
}

/**
 * Set the trainer's DEFAULT weekly check-in weekday (Settings). Stored on `trainers`
 * (default_checkin_weekday); the per-client schedule above can still override it. trainer_id is the
 * session user; weekday validated 0..6.
 */
export async function setTrainerDefaultCheckinWeekdayAction(
  weekday: number,
): Promise<ActionResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: SESSION_EXPIRED };
  if (roleOf(user) !== 'trainer') return { ok: false, error: COACH_ONLY };

  const parsed = weekdaySchema.safeParse(weekday);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? 'Pick a day of the week.' };
  }

  const { error } = await supabase
    .from('trainers')
    .update({ default_checkin_weekday: parsed.data })
    .eq('id', user.id);
  if (error) return { ok: false, error: 'We couldn’t save the default. Try again.' };

  revalidatePath('/coach/settings');
  return { ok: true };
}
