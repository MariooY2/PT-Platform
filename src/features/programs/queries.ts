import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '@/lib/supabase/types';
import type { ProgramListItem } from './types';

type DB = SupabaseClient<Database>;

/** All of a trainer's programs (templates + client copies) with a workout count. RLS scopes rows. */
export async function listPrograms(
  supabase: DB,
  trainerId: string,
): Promise<{ items: ProgramListItem[] | null; error: string | null }> {
  const { data, error } = await supabase
    .from('programs')
    .select(
      'id, trainer_id, title, description, weeks, is_template, client_id, source_program_id, status, created_at, updated_at, program_workouts(count)',
    )
    .eq('trainer_id', trainerId)
    .order('updated_at', { ascending: false });
  if (error) return { items: null, error: error.message };
  const items = (data ?? []).map((row) => {
    const { program_workouts, ...program } = row as typeof row & {
      program_workouts: { count: number }[];
    };
    return { ...program, workout_count: program_workouts?.[0]?.count ?? 0 } as ProgramListItem;
  });
  return { items, error: null };
}
