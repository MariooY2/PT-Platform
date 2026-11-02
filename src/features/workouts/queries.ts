import 'server-only';
import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '@/lib/supabase/types';
import { findScheduledForDate, nextScheduledAfter } from './lib';
import type {
  ExistingSetView,
  PlayerExercise,
  PreviousSetView,
  TodayState,
  TodayWorkoutCard,
  WorkoutPlayerData,
} from './types';

type DB = SupabaseClient<Database>;

// A client's active program copy with the data the Today card + scheduler need.
interface CopyRow {
  id: string;
  title: string;
  trainer_id: string;
  start_date: string | null;
  program_workouts: Array<{
    id: string;
    week: number;
    day: number;
    title: string | null;
    position: number;
    workout_exercises: Array<{ position: number; exercises: { name: string } | null }>;
  }>;
}

function cardFor(
  copy: CopyRow,
  pw: CopyRow['program_workouts'][number],
  date: string,
): TodayWorkoutCard {
  const exercises = [...pw.workout_exercises].sort((a, b) => a.position - b.position);
  return {
    programWorkoutId: pw.id,
    assignmentId: copy.id,
    scheduledDate: date,
    week: pw.week,
    day: pw.day,
    title: pw.title ?? copy.title,
    exerciseCount: exercises.length,
    exerciseNames: exercises.map((we) => we.exercises?.name ?? 'Exercise'),
  };
}

/**
 * The client's Today state: the workout scheduled for `today` by an active assignment, and whether it
 * is already in progress or completed. Rest day when a program exists but nothing is scheduled today;
 * no-program when there is no active copy. RLS scopes every read to this client.
 */
export async function getTodayState(
  supabase: DB,
  clientId: string,
  today: string,
): Promise<{ state: TodayState | null; error: string | null }> {
  const { data, error } = await supabase
    .from('programs')
    .select(
      `id, title, trainer_id, start_date,
       program_workouts(
         id, week, day, title, position,
         workout_exercises(position, exercises(name))
       )`,
    )
    .eq('client_id', clientId)
    .eq('is_template', false)
    .not('start_date', 'is', null)
    .order('start_date', { ascending: false });
  if (error) return { state: null, error: error.message };

  const copies = (data ?? []) as unknown as CopyRow[];
  if (copies.length === 0) return { state: { kind: 'no-program' }, error: null };

  // The first copy (most recent start) with a workout scheduled today wins.
  for (const copy of copies) {
    if (!copy.start_date) continue;
    const pw = findScheduledForDate(copy.program_workouts, copy.start_date, today);
    if (!pw) continue;

    const card = cardFor(copy, pw, today);

    const { data: logs, error: logErr } = await supabase
      .from('workout_logs')
      .select('id, status, session_rpe, set_logs(id, completed)')
      .eq('client_id', clientId)
      .eq('program_workout_id', pw.id)
      .eq('scheduled_date', today)
      .order('created_at', { ascending: false })
      .limit(1);
    if (logErr) return { state: null, error: logErr.message };

    const log = (logs ?? [])[0] as
      | {
          id: string;
          status: string;
          session_rpe: number | null;
          set_logs: { completed: boolean }[];
        }
      | undefined;
    if (!log) return { state: { kind: 'scheduled', workout: card }, error: null };

    const setsDone = (log.set_logs ?? []).filter((s) => s.completed).length;
    if (log.status === 'completed') {
      return {
        state: {
          kind: 'completed',
          workout: card,
          logId: log.id,
          setsDone,
          sessionRpe: log.session_rpe,
        },
        error: null,
      };
    }
    return { state: { kind: 'in-progress', workout: card, logId: log.id, setsDone }, error: null };
  }

  // A program exists but today is a rest day — point to the next scheduled workout, if any.
  let next: { title: string; date: string } | null = null;
  for (const copy of copies) {
    if (!copy.start_date) continue;
    const found = nextScheduledAfter(copy.program_workouts, copy.start_date, today);
    if (found && (!next || found.date < next.date)) {
      next = { title: found.workout.title ?? copy.title, date: found.date };
    }
  }
  return { state: { kind: 'rest-day', next }, error: null };
}

interface PlayerLogRow {
  id: string;
  status: WorkoutPlayerData['status'];
  started_at: string;
  completed_at: string | null;
  session_rpe: number | null;
  client_notes: string | null;
  scheduled_date: string | null;
  program_workouts: {
    title: string | null;
    week: number;
    day: number;
    workout_exercises: Array<{
      id: string;
      exercise_id: string;
      position: number;
      group_label: string | null;
      rest_seconds: number | null;
      notes: string | null;
      exercises: { name: string; video_url: string | null; instructions: string | null } | null;
      prescribed_sets: Array<{
        set_number: number;
        set_type: PlayerExercise['prescribedSets'][number]['setType'];
        reps_min: number | null;
        reps_max: number | null;
        weight_kg: number | null;
        rpe: number | null;
        duration_sec: number | null;
        distance_m: number | null;
      }>;
    }>;
  } | null;
}

/**
 * Everything the player renders for one workout_log: the exercises with their prescriptions, each
 * exercise's previous performance (the client's most recent prior session for it), the personal-record
 * set ids, and any already-saved sets (resume). RLS scopes every level to this client.
 */
export async function getWorkoutForPlayer(
  supabase: DB,
  clientId: string,
  logId: string,
): Promise<WorkoutPlayerData | null> {
  const { data, error } = await supabase
    .from('workout_logs')
    .select(
      `id, status, started_at, completed_at, session_rpe, client_notes, scheduled_date,
       program_workouts(
         title, week, day,
         workout_exercises(
           id, exercise_id, position, group_label, rest_seconds, notes,
           exercises(name, video_url, instructions),
           prescribed_sets(set_number, set_type, reps_min, reps_max, weight_kg, rpe, duration_sec, distance_m)
         )
       )`,
    )
    .eq('id', logId)
    .eq('client_id', clientId)
    .maybeSingle();
  if (error || !data) return null;

  const row = data as unknown as PlayerLogRow;
  const pw = row.program_workouts;
  const wexes = [...(pw?.workout_exercises ?? [])].sort((a, b) => a.position - b.position);
  const exerciseIds = [...new Set(wexes.map((w) => w.exercise_id))];

  // Previous performance: the client's completed sets for these exercises, from OTHER logs.
  const prevByExercise = new Map<string, PreviousSetView[]>();
  if (exerciseIds.length > 0) {
    const { data: prev } = await supabase
      .from('set_logs')
      .select('exercise_id, set_number, reps, weight_kg, completed, workout_log_id, created_at')
      .in('exercise_id', exerciseIds)
      .eq('completed', true)
      .neq('workout_log_id', logId)
      .order('created_at', { ascending: false });
    // Keep only the most recent prior log per exercise.
    const latestLogByExercise = new Map<string, string>();
    for (const s of prev ?? []) {
      if (!latestLogByExercise.has(s.exercise_id))
        latestLogByExercise.set(s.exercise_id, s.workout_log_id);
      if (latestLogByExercise.get(s.exercise_id) !== s.workout_log_id) continue;
      const list = prevByExercise.get(s.exercise_id) ?? [];
      list.push({ setNumber: s.set_number, weightKg: s.weight_kg, reps: s.reps });
      prevByExercise.set(s.exercise_id, list);
    }
    for (const list of prevByExercise.values()) list.sort((a, b) => a.setNumber - b.setNumber);
  }

  // Current personal records → which set_log ids are PRs (for the PR badge on a logged set).
  const prSetLogIds = new Set<string>();
  if (exerciseIds.length > 0) {
    const { data: prs } = await supabase
      .from('personal_records')
      .select('set_log_id')
      .eq('client_id', clientId)
      .in('exercise_id', exerciseIds);
    for (const pr of prs ?? []) if (pr.set_log_id) prSetLogIds.add(pr.set_log_id);
  }

  // Already-saved sets for this log (resume / edit), + their PR state by id.
  const { data: existing } = await supabase
    .from('set_logs')
    .select(
      'id, workout_exercise_id, set_number, reps, weight_kg, rpe, completed, client_generated_id',
    )
    .eq('workout_log_id', logId);
  const existingSets: ExistingSetView[] = (existing ?? []).map((s) => ({
    workoutExerciseId: s.workout_exercise_id,
    setNumber: s.set_number,
    clientGeneratedId: s.client_generated_id,
    reps: s.reps,
    weightKg: s.weight_kg,
    rpe: s.rpe,
    completed: s.completed,
  }));
  const prCgids = new Set(
    (existing ?? []).filter((s) => prSetLogIds.has(s.id)).map((s) => s.client_generated_id),
  );

  const exercises: PlayerExercise[] = wexes.map((we) => ({
    workoutExerciseId: we.id,
    exerciseId: we.exercise_id,
    name: we.exercises?.name ?? 'Exercise',
    videoUrl: we.exercises?.video_url ?? null,
    instructions: we.exercises?.instructions ?? null,
    coachNotes: we.notes,
    restSeconds: we.rest_seconds,
    groupLabel: we.group_label,
    prescribedSets: [...we.prescribed_sets]
      .sort((a, b) => a.set_number - b.set_number)
      .map((s) => ({
        setNumber: s.set_number,
        setType: s.set_type,
        repsMin: s.reps_min,
        repsMax: s.reps_max,
        weightKg: s.weight_kg,
        rpe: s.rpe,
        durationSec: s.duration_sec,
        distanceM: s.distance_m,
      })),
    previous: prevByExercise.get(we.exercise_id) ?? [],
    prClientGeneratedIds: [...prCgids], // PR sets, keyed by client_generated_id (stable across reloads)
  }));

  return {
    logId: row.id,
    title: pw?.title ?? 'Workout',
    week: pw?.week ?? 1,
    day: pw?.day ?? 1,
    status: row.status,
    startedAt: row.started_at,
    completedAt: row.completed_at,
    sessionRpe: row.session_rpe,
    clientNotes: row.client_notes,
    exercises,
    existingSets,
  };
}
