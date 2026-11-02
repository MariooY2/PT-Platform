import 'server-only';
import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '@/lib/supabase/types';
import { dueThisWeek, isoWeekRange, zonedDateString } from './week';

type DB = SupabaseClient<Database>;

/**
 * Materialise this ISO week's unsubmitted check-in responses.
 *
 * For every active check-in schedule whose weekday has arrived this week (today or earlier, in
 * Asia/Beirut) and whose client is still active, insert ONE unsubmitted `form_response` for the
 * schedule's form. Idempotent: a response already keyed to this client + form within the current ISO
 * week (by `due_date`) blocks a second one, so re-running the endpoint the same week creates nothing.
 *
 * The caller passes a service-role client (the cron route has no session and crosses tenants); this
 * module never imports the admin client itself, keeping the service key in `src/app/api/**`.
 */
export async function generateDueCheckins(
  supabase: DB,
  now: Date = new Date(),
): Promise<{ created: number }> {
  const today = zonedDateString(now);
  const { start: weekStart, end: weekEnd } = isoWeekRange(today);

  const { data: schedules } = await supabase
    .from('checkin_schedules')
    .select('trainer_id, client_id, form_id, weekday')
    .eq('active', true);
  if (!schedules || schedules.length === 0) return { created: 0 };

  // Only clients with an active coaching link get check-ins generated.
  const { data: links } = await supabase
    .from('trainer_clients')
    .select('trainer_id, client_id')
    .eq('status', 'active');
  const activePairs = new Set((links ?? []).map((l) => `${l.trainer_id}:${l.client_id}`));

  // Existing responses keyed to this ISO week — the idempotency guard.
  const { data: existing } = await supabase
    .from('form_responses')
    .select('client_id, form_id')
    .gte('due_date', weekStart)
    .lte('due_date', weekEnd);
  const alreadyDue = new Set((existing ?? []).map((r) => `${r.client_id}:${r.form_id}`));

  const toInsert: Array<{
    form_id: string;
    trainer_id: string;
    client_id: string;
    due_date: string;
    answers: Record<string, never>;
  }> = [];

  for (const s of schedules) {
    if (!activePairs.has(`${s.trainer_id}:${s.client_id}`)) continue;
    const { due, dueDate } = dueThisWeek(today, s.weekday);
    if (!due) continue;
    const key = `${s.client_id}:${s.form_id}`;
    if (alreadyDue.has(key)) continue;
    alreadyDue.add(key); // guard against a duplicate schedule row in the same run
    toInsert.push({
      form_id: s.form_id,
      trainer_id: s.trainer_id,
      client_id: s.client_id,
      due_date: dueDate,
      answers: {},
    });
  }

  if (toInsert.length === 0) return { created: 0 };

  const { error } = await supabase.from('form_responses').insert(toInsert);
  if (error) throw new Error(error.message);
  return { created: toInsert.length };
}
