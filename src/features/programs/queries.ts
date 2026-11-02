import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '@/lib/supabase/types';
import type { ClientProgramItem, Program, ProgramListItem } from './types';
import { usedByCounts } from './lib';

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
  const rows = (data ?? []) as Array<
    Program & { program_workouts: { count: number }[]; source_program_id: string | null }
  >;
  // "Used by (n)" per template = count of client copies pointing at it. Computed from the trainer's
  // own rows (a self-referential embed count isn't reliable; RLS already scopes these to the trainer).
  const used = usedByCounts(rows);
  const items = rows.map((row) => {
    const { program_workouts, ...program } = row;
    return {
      ...program,
      workout_count: program_workouts?.[0]?.count ?? 0,
      used_by: used[row.id] ?? 0,
    } as ProgramListItem;
  });
  return { items, error: null };
}

/** A client's assigned copies (the client-profile Program tab). RLS scopes rows to the trainer. */
export async function listClientPrograms(
  supabase: DB,
  trainerId: string,
  clientId: string,
): Promise<{ items: ClientProgramItem[] | null; error: string | null }> {
  const { data, error } = await supabase
    .from('programs')
    .select('id, title, weeks, status, start_date, program_workouts(count)')
    .eq('trainer_id', trainerId)
    .eq('client_id', clientId)
    .eq('is_template', false)
    .order('start_date', { ascending: false, nullsFirst: false });
  if (error) return { items: null, error: error.message };
  const items = (data ?? []).map((row) => {
    const r = row as typeof row & { program_workouts: { count: number }[] };
    return {
      id: r.id,
      title: r.title,
      weeks: r.weeks,
      status: r.status,
      startDate: r.start_date,
      workoutCount: r.program_workouts?.[0]?.count ?? 0,
    } satisfies ClientProgramItem;
  });
  return { items, error: null };
}

// Week 1 of a template, for the read-only assign preview. Reuses the full program load and slices.
export type WeekOnePreview = {
  title: string;
  weeks: number;
  workouts: LoadedProgram['program_workouts'];
};

export async function loadWeekOne(
  supabase: DB,
  templateId: string,
): Promise<WeekOnePreview | null> {
  const program = await loadProgram(supabase, templateId);
  if (!program) return null;
  return {
    title: program.title,
    weeks: program.weeks,
    workouts: program.program_workouts.filter((w) => w.week === 1),
  };
}
