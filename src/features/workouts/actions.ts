'use server';

import type { SupabaseClient } from '@supabase/supabase-js';
import { revalidatePath } from 'next/cache';
import type { Database } from '@/lib/supabase/types';
import { createClient } from '@/lib/supabase/server';
import { roleOf } from '@/lib/supabase/middleware';
import { todayFor } from '@/features/habits/lib';
import {
  finishWorkoutSchema,
  logSetSchema,
  startWorkoutSchema,
  type FinishWorkoutInput,
  type LogSetInput,
  type StartWorkoutInput,
} from './schemas';
import { findScheduledForDate } from './lib';

/**
 * Resolve today's scheduled workout for a client: its program (assignment) and the program's trainer.
 * Verifies the programWorkoutId came from the client's real schedule and pins trainer_id from the
 * program rather than the browser. Kept here (not in the server-only query module) so the action stays
 * unit-testable. RLS scopes the read to this client.
 */
async function resolveScheduledWorkout(
  supabase: SupabaseClient<Database>,
  clientId: string,
  programWorkoutId: string,
  today: string,
): Promise<{ assignmentId: string; trainerId: string } | null> {
  const { data, error } = await supabase
    .from('programs')
    .select('id, trainer_id, start_date, program_workouts(id, week, day)')
    .eq('client_id', clientId)
    .eq('is_template', false)
    .not('start_date', 'is', null)
    .order('start_date', { ascending: false });
  if (error || !data) return null;

  type Copy = {
    id: string;
    trainer_id: string;
    start_date: string | null;
    program_workouts: Array<{ id: string; week: number; day: number }>;
  };
  for (const copy of data as unknown as Copy[]) {
    if (!copy.start_date) continue;
    const pw = findScheduledForDate(copy.program_workouts, copy.start_date, today);
    if (pw && pw.id === programWorkoutId) {
      return { assignmentId: copy.id, trainerId: copy.trainer_id };
    }
  }
  return null;
}

const GENERIC_ERROR = 'Something went wrong. Try again.';
const NOT_SCHEDULED = 'That workout isn’t scheduled for today.';
const NOT_FOUND = 'We couldn’t find that workout.';

/** Resolve the signed-in client, or an error result. client_id always comes from the session. */
async function requireClient() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user || roleOf(user) !== 'client') {
    return { supabase: null, userId: null, error: 'You need to sign in as a client.' } as const;
  }
  return { supabase, userId: user.id, error: null } as const;
}

async function todayForClient(
  supabase: NonNullable<Awaited<ReturnType<typeof requireClient>>['supabase']>,
  userId: string,
): Promise<string> {
  const { data: profile } = await supabase
    .from('profiles')
    .select('timezone')
    .eq('id', userId)
    .maybeSingle();
  return todayFor(profile?.timezone);
}

/**
 * Start (or resume) today's scheduled workout. The programWorkoutId is verified against the client's
 * real schedule server-side (never trusted raw), trainer_id is pinned from the program, and an
 * existing log for the same (workout, date) is resumed instead of duplicated. The insert is idempotent
 * on client_generated_id so a double-submit never creates two logs.
 */
export async function startWorkoutAction(
  input: StartWorkoutInput,
): Promise<{ ok: true; logId: string } | { error: string }> {
  const parsed = startWorkoutSchema.safeParse(input);
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? NOT_FOUND };

  const { supabase, userId, error } = await requireClient();
  if (error) return { error };

  const today = await todayForClient(supabase, userId);
  const scheduled = await resolveScheduledWorkout(
    supabase,
    userId,
    parsed.data.programWorkoutId,
    today,
  );
  if (!scheduled) return { error: NOT_SCHEDULED };

  // Resume an existing log for the same workout + date rather than creating another.
  const { data: existing } = await supabase
    .from('workout_logs')
    .select('id')
    .eq('client_id', userId)
    .eq('program_workout_id', parsed.data.programWorkoutId)
    .eq('scheduled_date', today)
    .order('created_at', { ascending: false })
    .limit(1);
  const found = (existing ?? [])[0];
  if (found) return { ok: true, logId: found.id };

  const { data, error: insertError } = await supabase
    .from('workout_logs')
    .upsert(
      {
        client_id: userId,
        trainer_id: scheduled.trainerId,
        assignment_id: scheduled.assignmentId,
        program_workout_id: parsed.data.programWorkoutId,
        scheduled_date: today,
        status: 'in_progress',
        client_generated_id: parsed.data.clientGeneratedId,
      },
      { onConflict: 'client_generated_id' },
    )
    .select('id')
    .single();
  if (insertError || !data) return { error: GENERIC_ERROR };

  revalidatePath('/client');
  return { ok: true, logId: data.id };
}

/**
 * Log, edit or undo one set. The write is a single on-conflict upsert keyed by client_generated_id —
 * never read-then-insert — so an offline/retry replay never duplicates. exercise_id is derived from the
 * workout_exercise server-side; reps/weight/rpe are validated. PRs are detected by the server trigger;
 * this returns which PR types the new set set (read, not computed) so the UI can badge it.
 */
export async function logSetAction(
  input: LogSetInput,
): Promise<{ ok: true; setLogId: string; prTypes: string[] } | { error: string }> {
  const parsed = logSetSchema.safeParse(input);
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? GENERIC_ERROR };

  // client_id is enforced by RLS (owns_workout_log) on both the parent log and the set.
  const { supabase, error } = await requireClient();
  if (error) return { error };

  // Derive the exercise from the prescription row (not trusted from the browser).
  const { data: wex } = await supabase
    .from('workout_exercises')
    .select('exercise_id')
    .eq('id', parsed.data.workoutExerciseId)
    .maybeSingle();
  if (!wex) return { error: NOT_FOUND };

  const { data, error: writeError } = await supabase
    .from('set_logs')
    .upsert(
      {
        workout_log_id: parsed.data.workoutLogId,
        workout_exercise_id: parsed.data.workoutExerciseId,
        exercise_id: wex.exercise_id,
        set_number: parsed.data.setNumber,
        reps: parsed.data.reps,
        weight_kg: parsed.data.weightKg,
        rpe: parsed.data.rpe,
        completed: parsed.data.completed,
        client_generated_id: parsed.data.clientGeneratedId,
      },
      { onConflict: 'client_generated_id' },
    )
    .select('id')
    .single();
  if (writeError || !data) return { error: GENERIC_ERROR };

  // Read the server's PR decision for this set (the trigger writes personal_records; we never do).
  const { data: prs } = await supabase
    .from('personal_records')
    .select('type')
    .eq('set_log_id', data.id);
  return { ok: true, setLogId: data.id, prTypes: (prs ?? []).map((p) => p.type) };
}

/**
 * Finish the session: mark the log completed with completed_at, the session RPE and an optional note.
 * Scoped to the session client; RLS rejects another client's log.
 */
export async function finishWorkoutAction(
  input: FinishWorkoutInput,
): Promise<{ ok: true } | { error: string }> {
  const parsed = finishWorkoutSchema.safeParse(input);
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? GENERIC_ERROR };

  const { supabase, userId, error } = await requireClient();
  if (error) return { error };

  const { data, error: updateError } = await supabase
    .from('workout_logs')
    .update({
      status: 'completed',
      completed_at: new Date().toISOString(),
      session_rpe: parsed.data.sessionRpe,
      client_notes: parsed.data.note?.length ? parsed.data.note : null,
    })
    .eq('id', parsed.data.workoutLogId)
    .eq('client_id', userId)
    .select('id');
  if (updateError) return { error: GENERIC_ERROR };
  if (!data?.length) return { error: NOT_FOUND };

  revalidatePath('/client');
  return { ok: true };
}
