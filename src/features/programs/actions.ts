'use server';

import { z } from 'zod';
import type { SupabaseClient } from '@supabase/supabase-js';
import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';
import { roleOf } from '@/lib/supabase/middleware';
import type { Database } from '@/lib/supabase/types';
import { parseNewProgram } from './schemas';
import { parseQuickEntry } from './quick-entry';

export type ActionResult = { ok: true; id?: string } | { error: string };

const GENERIC = 'Something went wrong. Try again.';

// Shared field validators — every server action validates its inputs; ids/bounds never trusted from
// the browser (RLS still enforces ownership, this stops malformed rows, e.g. week 999 or day 0).
const uuid = z.string().uuid();
const week = z.number().int().min(1).max(52);
const day = z.number().int().min(1).max(7);
const position = z.number().int().min(0).max(999);
const status = z.enum(['draft', 'published']);
const workoutPatch = z.object({
  title: z.string().trim().max(120).optional(),
  notes: z.string().trim().max(2000).optional(),
});

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
  weekNo: number,
  dayNo: number,
): Promise<ActionResult> {
  const v = z.object({ programId: uuid, weekNo: week, dayNo: day }).safeParse({
    programId,
    weekNo,
    dayNo,
  });
  if (!v.success) return { error: GENERIC };
  const auth = await requireTrainer();
  if (!auth.ok) return { error: auth.error };
  const { error } = await auth.supabase
    .from('program_workouts')
    .insert({ program_id: programId, week: weekNo, day: dayNo, title: 'New workout' });
  if (error) return { error: GENERIC };
  bust(programId);
  return { ok: true };
}

export async function updateWorkoutAction(
  programId: string,
  workoutId: string,
  patch: { title?: string; notes?: string },
): Promise<ActionResult> {
  const v = z
    .object({ programId: uuid, workoutId: uuid, patch: workoutPatch })
    .safeParse({ programId, workoutId, patch });
  if (!v.success) return { error: GENERIC };
  const auth = await requireTrainer();
  if (!auth.ok) return { error: auth.error };
  const { error } = await auth.supabase
    .from('program_workouts')
    .update(v.data.patch)
    .eq('id', workoutId);
  if (error) return { error: GENERIC };
  bust(programId);
  return { ok: true };
}

export async function deleteWorkoutAction(
  programId: string,
  workoutId: string,
): Promise<ActionResult> {
  const v = z.object({ programId: uuid, workoutId: uuid }).safeParse({ programId, workoutId });
  if (!v.success) return { error: GENERIC };
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
  pos: number,
): Promise<ActionResult> {
  const v = z
    .object({ programId: uuid, workoutId: uuid, exerciseId: uuid, pos: position })
    .safeParse({ programId, workoutId, exerciseId, pos });
  if (!v.success) return { error: GENERIC };
  const auth = await requireTrainer();
  if (!auth.ok) return { error: auth.error };
  const { error } = await auth.supabase
    .from('workout_exercises')
    .insert({ program_workout_id: workoutId, exercise_id: exerciseId, position: pos });
  if (error) return { error: GENERIC };
  bust(programId);
  return { ok: true };
}

export async function deleteExerciseAction(
  programId: string,
  workoutExerciseId: string,
): Promise<ActionResult> {
  const v = z
    .object({ programId: uuid, workoutExerciseId: uuid })
    .safeParse({ programId, workoutExerciseId });
  if (!v.success) return { error: GENERIC };
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

/**
 * Superset grouping. With a `partnerExerciseId`, group this exercise with its neighbour under the next
 * free letter (A1/A2, then B1/B2…). With `null`, ungroup — clear the whole letter group this exercise
 * belongs to. Labels are assigned server-side from the workout's existing labels, never by the browser.
 */
export async function setSupersetAction(
  programId: string,
  workoutExerciseId: string,
  partnerExerciseId: string | null,
): Promise<ActionResult> {
  const v = z
    .object({ programId: uuid, workoutExerciseId: uuid, partnerExerciseId: uuid.nullable() })
    .safeParse({ programId, workoutExerciseId, partnerExerciseId });
  if (!v.success) return { error: GENERIC };
  const auth = await requireTrainer();
  if (!auth.ok) return { error: auth.error };

  const { data: self, error: selfErr } = await auth.supabase
    .from('workout_exercises')
    .select('program_workout_id, group_label')
    .eq('id', workoutExerciseId)
    .single();
  if (selfErr || !self) return { error: GENERIC };

  const { data: siblings, error: sibErr } = await auth.supabase
    .from('workout_exercises')
    .select('id, group_label')
    .eq('program_workout_id', self.program_workout_id);
  if (sibErr || !siblings) return { error: GENERIC };

  if (partnerExerciseId === null) {
    // Ungroup the whole letter group (A1 + A2 both clear).
    const letter = self.group_label?.[0];
    const targetIds = letter
      ? siblings.filter((s) => s.group_label?.[0] === letter).map((s) => s.id)
      : [workoutExerciseId];
    const { error } = await auth.supabase
      .from('workout_exercises')
      .update({ group_label: null })
      .in('id', targetIds);
    if (error) return { error: GENERIC };
  } else {
    // Pick the next free letter among the workout's existing groups.
    const used = new Set(siblings.map((s) => s.group_label?.[0]).filter((c): c is string => !!c));
    let letter = 'A';
    while (used.has(letter)) letter = String.fromCharCode(letter.charCodeAt(0) + 1);
    if (letter > 'Z') return { error: GENERIC };
    const { error: e1 } = await auth.supabase
      .from('workout_exercises')
      .update({ group_label: `${letter}1` })
      .eq('id', workoutExerciseId);
    const { error: e2 } = await auth.supabase
      .from('workout_exercises')
      .update({ group_label: `${letter}2` })
      .eq('id', partnerExerciseId);
    if (e1 || e2) return { error: GENERIC };
  }
  bust(programId);
  return { ok: true };
}

/** Expand coach shorthand into prescribed sets for one exercise (replaces its existing sets). */
export async function applyQuickEntryAction(
  programId: string,
  workoutExerciseId: string,
  text: string,
): Promise<ActionResult> {
  const v = z.object({ programId: uuid, workoutExerciseId: uuid }).safeParse({
    programId,
    workoutExerciseId,
  });
  if (!v.success) return { error: GENERIC };
  const parsed = parseQuickEntry(text);
  if (!parsed.ok) return { error: parsed.error };
  const auth = await requireTrainer();
  if (!auth.ok) return { error: auth.error };

  // Fail before deleting if the delete can't run, so a parse's sets are never dropped on a half-apply.
  const { error: delError } = await auth.supabase
    .from('prescribed_sets')
    .delete()
    .eq('workout_exercise_id', workoutExerciseId);
  if (delError) return { error: GENERIC };
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
  nextStatus: 'draft' | 'published',
): Promise<ActionResult> {
  const v = z.object({ programId: uuid, nextStatus: status }).safeParse({ programId, nextStatus });
  if (!v.success) return { error: GENERIC };
  const auth = await requireTrainer();
  if (!auth.ok) return { error: auth.error };
  const { error } = await auth.supabase
    .from('programs')
    .update({ status: nextStatus })
    .eq('id', programId);
  if (error) return { error: GENERIC };
  bust(programId);
  return { ok: true };
}
