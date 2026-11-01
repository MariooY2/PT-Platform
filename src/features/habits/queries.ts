import 'server-only';
import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '@/lib/supabase/types';

type DB = SupabaseClient<Database>;

/** One of the client's habits plus whether it is already ticked for the given day. */
export interface ClientHabit {
  id: string;
  name: string;
  target: number | null;
  unit: string | null;
  done: boolean;
}

/** A habit as the coach manages it (active and inactive both shown). */
export interface TrainerHabit {
  id: string;
  name: string;
  target: number | null;
  unit: string | null;
  active: boolean;
}

/**
 * The client's active habits with today's tick state. Two scoped reads (habits, then today's logs)
 * rather than an embedded filter, so a missing log reliably reads as "not done" under RLS.
 */
export async function listActiveHabitsWithToday(
  supabase: DB,
  clientId: string,
  today: string,
): Promise<{ items: ClientHabit[] | null; error: string | null }> {
  const habitsRes = await supabase
    .from('habits')
    .select('id, name, target_value, unit')
    .eq('client_id', clientId)
    .eq('active', true)
    .order('created_at', { ascending: true });
  if (habitsRes.error) return { items: null, error: habitsRes.error.message };

  const habits = habitsRes.data ?? [];
  if (habits.length === 0) return { items: [], error: null };

  const logsRes = await supabase
    .from('habit_logs')
    .select('habit_id')
    .eq('client_id', clientId)
    .eq('log_date', today);
  if (logsRes.error) return { items: null, error: logsRes.error.message };

  const done = new Set((logsRes.data ?? []).map((l) => l.habit_id));
  return {
    items: habits.map((h) => ({
      id: h.id,
      name: h.name,
      target: h.target_value,
      unit: h.unit,
      done: done.has(h.id),
    })),
    error: null,
  };
}

/** All of this client's habits for the coach's manager — active first, then by creation order. */
export async function listHabitsForTrainer(
  supabase: DB,
  trainerId: string,
  clientId: string,
): Promise<{ items: TrainerHabit[] | null; error: string | null }> {
  const { data, error } = await supabase
    .from('habits')
    .select('id, name, target_value, unit, active')
    .eq('trainer_id', trainerId)
    .eq('client_id', clientId)
    .order('active', { ascending: false })
    .order('created_at', { ascending: true });
  if (error) return { items: null, error: error.message };
  return {
    items: (data ?? []).map((h) => ({
      id: h.id,
      name: h.name,
      target: h.target_value,
      unit: h.unit,
      active: h.active,
    })),
    error: null,
  };
}
