'use server';

import type { SupabaseClient } from '@supabase/supabase-js';
import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';
import { roleOf } from '@/lib/supabase/middleware';
import type { Database } from '@/lib/supabase/types';
import { parseNewProgram } from './schemas';
import { parseQuickEntry } from './quick-entry';

export type ActionResult = { ok: true; id?: string } | { error: string };

const GENERIC = 'Something went wrong. Try again.';

type TrainerCtx =
  | { ok: false; error: string }
  | { ok: true; supabase: SupabaseClient<Database>; trainerId: string };

async function requireTrainer(): Promise<TrainerCtx> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user || roleOf(user) !== 'trainer')
    return { ok: false, error: 'Sign in as a coach to do that.' };
  return { ok: true, supabase, trainerId: user.id };
}

/** Create a blank template program owned by the session trainer. */
export async function createProgramAction(formData: FormData): Promise<ActionResult> {
  const parsed = parseNewProgram(formData);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? 'Check the program details.' };
  }
  const auth = await requireTrainer();
  if (!auth.ok) return { error: auth.error };

  const { data, error } = await auth.supabase
    .from('programs')
    .insert({
      trainer_id: auth.trainerId,
      title: parsed.data.title,
      weeks: parsed.data.weeks,
      is_template: true,
      status: 'draft',
    })
    .select('id')
    .single();
  if (error || !data) return { error: GENERIC };

  revalidatePath('/coach/programs');
  return { ok: true, id: data.id };
}

const bust = (programId: string) => revalidatePath(`/coach/programs/${programId}`);

export async function addWorkoutAction(
  programId: string,
  week: number,
  day: number,
): Promise<ActionResult> {
  const auth = await requireTrainer();
  if (!auth.ok) return { error: auth.error };
  const { error } = await auth.supabase
    .from('program_workouts')
    .insert({ program_id: programId, week, day, title: 'New workout' });
  if (error) return { error: GENERIC };
  bust(programId);
  return { ok: true };
}

export async function updateWorkoutAction(
  programId: string,
  workoutId: string,
  patch: { title?: string; notes?: string },
): Promise<ActionResult> {
  const auth = await requireTrainer();
  if (!auth.ok) return { error: auth.error };
  const { error } = await auth.supabase.from('program_workouts').update(patch).eq('id', workoutId);
  if (error) return { error: GENERIC };
  bust(programId);
  return { ok: true };
}

export async function deleteWorkoutAction(
  programId: string,
  workoutId: string,
): Promise<ActionResult> {
  const auth = await requireTrainer();
  if (!auth.ok) return { error: auth.error };
  const { error } = await auth.supabase.from('program_workouts').delete().eq('id', workoutId);
  if (error) return { error: GENERIC };
  bust(programId);
  return { ok: true };
}

export async function addExerciseAction(
  programId: string,
  workoutId: string,
  exerciseId: string,
  position: number,
): Promise<ActionResult> {
  const auth = await requireTrainer();
  if (!auth.ok) return { error: auth.error };
  const { error } = await auth.supabase
    .from('workout_exercises')
    .insert({ program_workout_id: workoutId, exercise_id: exerciseId, position });
  if (error) return { error: GENERIC };
  bust(programId);
  return { ok: true };
}

export async function deleteExerciseAction(
  programId: string,
  workoutExerciseId: string,
): Promise<ActionResult> {
  const auth = await requireTrainer();
  if (!auth.ok) return { error: auth.error };
  const { error } = await auth.supabase
    .from('workout_exercises')
    .delete()
    .eq('id', workoutExerciseId);
  if (error) return { error: GENERIC };
  bust(programId);
  return { ok: true };
}

export async function setSupersetAction(
  programId: string,
  workoutExerciseId: string,
  groupLabel: string | null,
): Promise<ActionResult> {
  const auth = await requireTrainer();
  if (!auth.ok) return { error: auth.error };
  const { error } = await auth.supabase
    .from('workout_exercises')
    .update({ group_label: groupLabel })
    .eq('id', workoutExerciseId);
  if (error) return { error: GENERIC };
  bust(programId);
  return { ok: true };
}

/** Expand coach shorthand into prescribed sets for one exercise (replaces its existing sets). */
export async function applyQuickEntryAction(
  programId: string,
  workoutExerciseId: string,
  text: string,
): Promise<ActionResult> {
  const parsed = parseQuickEntry(text);
  if (!parsed.ok) return { error: parsed.error };
  const auth = await requireTrainer();
  if (!auth.ok) return { error: auth.error };

  await auth.supabase.from('prescribed_sets').delete().eq('workout_exercise_id', workoutExerciseId);
  const rows = parsed.sets.map((s, i) => ({
    workout_exercise_id: workoutExerciseId,
    set_number: i + 1,
    set_type: 'working' as const,
    reps_min: s.reps_min,
    reps_max: s.reps_max,
    weight_kg: s.weight_kg,
    percent_1rm: s.percent_1rm,
    rpe: s.rpe,
    rir: s.rir,
    duration_sec: s.duration_sec,
  }));
  const { error } = await auth.supabase.from('prescribed_sets').insert(rows);
  if (error) return { error: GENERIC };
  bust(programId);
  return { ok: true };
}

export async function setProgramStatusAction(
  programId: string,
  status: 'draft' | 'published',
): Promise<ActionResult> {
  const auth = await requireTrainer();
  if (!auth.ok) return { error: auth.error };
  const { error } = await auth.supabase.from('programs').update({ status }).eq('id', programId);
  if (error) return { error: GENERIC };
  bust(programId);
  return { ok: true };
}
