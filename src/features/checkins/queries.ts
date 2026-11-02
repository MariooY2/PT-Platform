import 'server-only';
import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '@/lib/supabase/types';

type DB = SupabaseClient<Database>;

export interface ClientSchedule {
  weekday: number;
  active: boolean;
}

export interface DueCheckin {
  id: string;
  formTitle: string;
  dueDate: string | null;
}

export interface CheckinHistoryItem {
  id: string;
  formTitle: string;
  submittedAt: string;
  reviewed: boolean;
}

/** The id of the trainer's default weekly check-in form, or null if they somehow have none. */
export async function defaultCheckinFormId(
  supabase: DB,
  trainerId: string,
): Promise<string | null> {
  const { data } = await supabase
    .from('forms')
    .select('id')
    .eq('trainer_id', trainerId)
    .eq('kind', 'checkin')
    .eq('is_default', true)
    .maybeSingle();
  return data?.id ?? null;
}

/** The trainer's default weekly check-in weekday (Settings), or null when unset. Used to prefill a
 * client's Check-in tab before the trainer sets a per-client day. */
export async function getTrainerDefaultCheckinWeekday(
  supabase: DB,
  trainerId: string,
): Promise<number | null> {
  const { data } = await supabase
    .from('trainers')
    .select('default_checkin_weekday')
    .eq('id', trainerId)
    .maybeSingle();
  return data?.default_checkin_weekday ?? null;
}

/** A client's current check-in schedule under this trainer, or null when none is set yet. */
export async function getClientSchedule(
  supabase: DB,
  trainerId: string,
  clientId: string,
): Promise<ClientSchedule | null> {
  const { data } = await supabase
    .from('checkin_schedules')
    .select('weekday, active')
    .eq('trainer_id', trainerId)
    .eq('client_id', clientId)
    .maybeSingle();
  if (!data) return null;
  return { weekday: data.weekday, active: data.active };
}

/**
 * A client's own check-ins, split into due (unsubmitted) and submitted history, newest first.
 * Only `checkin`-kind responses — the intake is handled by its own gate.
 */
export async function listClientCheckins(
  supabase: DB,
  clientId: string,
): Promise<{ due: DueCheckin[]; history: CheckinHistoryItem[]; error: string | null }> {
  const { data, error } = await supabase
    .from('form_responses')
    .select(
      'id, submitted_at, reviewed_at, due_date, created_at, form:forms!form_responses_form_id_fkey(title, kind)',
    )
    .eq('client_id', clientId)
    .order('created_at', { ascending: false });
  if (error) return { due: [], history: [], error: error.message };

  const rows = (data ?? []).filter((r) => r.form?.kind === 'checkin');
  const due: DueCheckin[] = rows
    .filter((r) => !r.submitted_at)
    .map((r) => ({ id: r.id, formTitle: r.form!.title, dueDate: r.due_date ?? null }));
  const history: CheckinHistoryItem[] = rows
    .filter((r) => r.submitted_at)
    .map((r) => ({
      id: r.id,
      formTitle: r.form!.title,
      submittedAt: r.submitted_at as string,
      reviewed: Boolean(r.reviewed_at),
    }));
  return { due, history, error: null };
}
