import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '@/lib/supabase/types';
import type { Program, ProgramListItem } from './types';

type DB = SupabaseClient<Database>;

// A program with its workouts, each workout's exercises, and each exercise's prescribed sets and the
// exercise name — everything the builder renders, in one round trip. RLS scopes every level.
export type LoadedProgram = Program & {
  program_workouts: Array<{
    id: string;
    week: number;
    day: number;
    title: string | null;
    notes: string | null;
    position: number;
    workout_exercises: Array<{
      id: string;
      exercise_id: string;
      position: number;
      group_label: string | null;
      rest_seconds: number | null;
      tempo: string | null;
      notes: string | null;
      exercises: { name: string; primary_muscle: string } | null;
      prescribed_sets: Array<{
        id: string;
        set_number: number;
        set_type: Database['public']['Enums']['prescribed_set_type'];
        reps_min: number | null;
        reps_max: number | null;
        weight_kg: number | null;
        percent_1rm: number | null;
        rpe: number | null;
        rir: number | null;
        duration_sec: number | null;
        distance_m: number | null;
      }>;
    }>;
  }>;
};

export async function loadProgram(supabase: DB, id: string): Promise<LoadedProgram | null> {
  const { data, error } = await supabase
    .from('programs')
    .select(
      `*, program_workouts(
        id, week, day, title, notes, position,
        workout_exercises(
          id, exercise_id, position, group_label, rest_seconds, tempo, notes,
          exercises(name, primary_muscle),
          prescribed_sets(id, set_number, set_type, reps_min, reps_max, weight_kg, percent_1rm, rpe, rir, duration_sec, distance_m)
        )
      )`,
    )
    .eq('id', id)
    .maybeSingle();
  if (error || !data) return null;
  return data as unknown as LoadedProgram;
}

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
