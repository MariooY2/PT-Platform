import 'server-only';
import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '@/lib/supabase/types';
import { scheduledDateFor } from '@/features/workouts/lib';
import {
  compliance,
  dailyWeights,
  dayStatuses,
  e1rmSeries,
  rolling7,
  sixWeekChange,
  weightChange,
  type DayStatus,
  type LogForDay,
} from './lib';
import type {
  BodyMeasurementRow,
  BodyProgress,
  CalendarProgress,
  PhotoDate,
  PrEntry,
  ProgressPhotoView,
  StrengthLift,
} from './types';

type DB = SupabaseClient<Database>;

const POSE_ORDER = { front: 0, side: 1, back: 2 } as const;

// ---------------------------------------------------------------------------
// Strength — e1RM over time + latest/change + PR history, per main lift.
// RLS scopes set_logs (owns_workout_log) and personal_records to this client.
// ---------------------------------------------------------------------------

interface SetRow {
  exercise_id: string;
  reps: number | null;
  weight_kg: number | null;
  created_at: string;
  workout_logs: { scheduled_date: string | null; completed_at: string | null } | null;
  exercises: { name: string } | null;
}

interface PrRow {
  exercise_id: string;
  type: PrEntry['type'];
  value: number;
  achieved_at: string;
}

const dateOf = (iso: string) => iso.slice(0, 10);

export async function getStrengthProgress(
  supabase: DB,
  clientId: string,
  today: string,
): Promise<{ lifts: StrengthLift[]; error: boolean }> {
  const setsP = supabase
    .from('set_logs')
    .select(
      'exercise_id, reps, weight_kg, created_at, workout_logs!inner(client_id, scheduled_date, completed_at), exercises(name)',
    )
    .eq('completed', true)
    .not('weight_kg', 'is', null)
    .not('reps', 'is', null);
  const prsP = supabase
    .from('personal_records')
    .select('exercise_id, type, value, achieved_at')
    .eq('client_id', clientId);

  const [{ data: sets, error: setsErr }, { data: prs, error: prsErr }] = await Promise.all([
    setsP,
    prsP,
  ]);
  if (setsErr || prsErr) return { lifts: [], error: true };

  const rows = (sets ?? []) as unknown as SetRow[];
  const byExercise = new Map<
    string,
    { name: string; sets: { date: string; weightKg: number; reps: number }[] }
  >();
  for (const r of rows) {
    if (r.weight_kg == null || r.reps == null) continue;
    // Prefer the plain scheduled_date so the Strength and Calendar tabs agree on which day a session
    // belongs to around midnight Beirut; fall back to completed_at's day, then the row's created day.
    const date =
      r.workout_logs?.scheduled_date ??
      (r.workout_logs?.completed_at ? dateOf(r.workout_logs.completed_at) : dateOf(r.created_at));
    const entry = byExercise.get(r.exercise_id) ?? {
      name: r.exercises?.name ?? 'Exercise',
      sets: [],
    };
    entry.sets.push({ date, weightKg: r.weight_kg, reps: r.reps });
    byExercise.set(r.exercise_id, entry);
  }

  const prsByExercise = new Map<string, PrEntry[]>();
  for (const pr of (prs ?? []) as unknown as PrRow[]) {
    const list = prsByExercise.get(pr.exercise_id) ?? [];
    list.push({ type: pr.type, value: pr.value, achievedAt: pr.achieved_at });
    prsByExercise.set(pr.exercise_id, list);
  }

  const lifts: StrengthLift[] = [];
  for (const [exerciseId, { name, sets: exSets }] of byExercise) {
    const series = e1rmSeries(exSets);
    if (series.length === 0) continue;
    const { latest, delta } = sixWeekChange(series, today);
    lifts.push({
      exerciseId,
      name,
      latestE1rm: latest ?? series[series.length - 1].value,
      deltaE1rm: delta,
      series,
      prs: (prsByExercise.get(exerciseId) ?? []).sort((a, b) => a.type.localeCompare(b.type)),
      lastSession: series[series.length - 1].date,
    });
  }
  // Most recently trained lift first; name as a tiebreak.
  lifts.sort((a, b) => b.lastSession.localeCompare(a.lastSession) || a.name.localeCompare(b.name));
  return { lifts, error: false };
}

// ---------------------------------------------------------------------------
// Body — weight series (+ 7-day average) and the measurements table.
// ---------------------------------------------------------------------------

export async function getBodyProgress(
  supabase: DB,
  clientId: string,
): Promise<{ body: BodyProgress; error: boolean }> {
  const empty: BodyProgress = {
    points: [],
    average: [],
    latestWeight: null,
    deltaWeight: null,
    rows: [],
  };
  const { data, error } = await supabase
    .from('body_metrics')
    .select(
      'id, measured_on, weight_kg, body_fat_pct, waist_cm, hips_cm, chest_cm, arm_cm, thigh_cm, notes',
    )
    .eq('client_id', clientId)
    .order('measured_on', { ascending: true })
    .order('created_at', { ascending: true });
  if (error) return { body: empty, error: true };

  const ascending = data ?? [];
  const points = dailyWeights(
    ascending.map((r) => ({ measuredOn: r.measured_on, weightKg: r.weight_kg })),
  );
  const average = rolling7(points);
  const { latest, delta } = weightChange(points);

  const rows: BodyMeasurementRow[] = [...ascending]
    .reverse() // newest first for the table
    .map((r) => ({
      id: r.id,
      measuredOn: r.measured_on,
      weightKg: r.weight_kg,
      bodyFatPct: r.body_fat_pct,
      waistCm: r.waist_cm,
      hipsCm: r.hips_cm,
      chestCm: r.chest_cm,
      armCm: r.arm_cm,
      thighCm: r.thigh_cm,
      notes: r.notes,
    }));

  return {
    body: { points, average, latestWeight: latest, deltaWeight: delta, rows },
    error: false,
  };
}

// ---------------------------------------------------------------------------
// Photos — front/side/back grouped by date, served via signed URLs (private bucket).
// ---------------------------------------------------------------------------

export async function getPhotoProgress(
  supabase: DB,
  clientId: string,
): Promise<{ dates: PhotoDate[]; error: boolean }> {
  const { data, error } = await supabase
    .from('progress_photos')
    .select('id, pose, taken_on, storage_path')
    .eq('client_id', clientId)
    .order('taken_on', { ascending: false })
    .order('created_at', { ascending: false });
  if (error) return { dates: [], error: true };

  const rows = data ?? [];
  const paths = rows.map((r) => r.storage_path);
  const signedByPath = new Map<string, string>();
  if (paths.length > 0) {
    const { data: signed } = await supabase.storage
      .from('progress-photos')
      .createSignedUrls(paths, 3600);
    for (const s of signed ?? []) {
      if (s.signedUrl && s.path) signedByPath.set(s.path, s.signedUrl);
    }
  }

  const byDate = new Map<string, ProgressPhotoView[]>();
  for (const r of rows) {
    const list = byDate.get(r.taken_on) ?? [];
    list.push({
      id: r.id,
      pose: r.pose,
      takenOn: r.taken_on,
      url: signedByPath.get(r.storage_path) ?? null,
    });
    byDate.set(r.taken_on, list);
  }

  const dates: PhotoDate[] = [...byDate.entries()]
    .sort((a, b) => b[0].localeCompare(a[0]))
    .map(([date, photos]) => ({
      date,
      photos: photos.sort((a, b) => POSE_ORDER[a.pose] - POSE_ORDER[b.pose]),
    }));
  return { dates, error: false };
}

// ---------------------------------------------------------------------------
// Calendar — a month of completed/partial/missed days + compliance.
// Scheduled days come from the client's active program copies (like getTodayState);
// logs come from workout_logs. Both RLS-scoped to this client.
// ---------------------------------------------------------------------------

interface CopyRow {
  start_date: string | null;
  program_workouts: { week: number; day: number }[];
}

export async function getCalendarProgress(
  supabase: DB,
  clientId: string,
  year: number,
  month: number, // 1-based
  today: string,
): Promise<{ calendar: CalendarProgress; error: boolean }> {
  const monthStart = `${year}-${String(month).padStart(2, '0')}-01`;
  // First day of the NEXT month — a half-open range avoids an invalid date literal like 2026-11-31
  // (which a .lte would reject in Postgres and fail the whole calendar query).
  const nextMonthStart =
    month === 12 ? `${year + 1}-01-01` : `${year}-${String(month + 1).padStart(2, '0')}-01`;

  const copiesP = supabase
    .from('programs')
    .select('start_date, program_workouts(week, day)')
    .eq('client_id', clientId)
    .eq('is_template', false)
    .not('start_date', 'is', null);
  const logsP = supabase
    .from('workout_logs')
    .select('scheduled_date, completed_at, status')
    .eq('client_id', clientId)
    .gte('scheduled_date', monthStart)
    .lt('scheduled_date', nextMonthStart);

  const [{ data: copies, error: copiesErr }, { data: logs, error: logsErr }] = await Promise.all([
    copiesP,
    logsP,
  ]);
  const emptyCal: CalendarProgress = {
    year,
    month,
    statuses: {},
    compliance: compliance([]),
  };
  if (copiesErr || logsErr) return { calendar: emptyCal, error: true };

  const inMonth = (d: string) => d >= monthStart && d < nextMonthStart;

  const scheduled: string[] = [];
  for (const copy of (copies ?? []) as unknown as CopyRow[]) {
    if (!copy.start_date) continue;
    for (const pw of copy.program_workouts ?? []) {
      const date = scheduledDateFor(copy.start_date, pw.week, pw.day);
      if (inMonth(date)) scheduled.push(date);
    }
  }

  const logsForDay: LogForDay[] = (logs ?? [])
    .filter((l) => l.scheduled_date && inMonth(l.scheduled_date))
    .map((l) => ({ date: l.scheduled_date as string, status: l.status }));

  const statusMap = dayStatuses(scheduled, logsForDay, today);
  const statuses: Record<string, DayStatus> = {};
  for (const [date, status] of statusMap) if (inMonth(date)) statuses[date] = status;

  return {
    calendar: {
      year,
      month,
      statuses,
      compliance: compliance(Object.values(statuses)),
    },
    error: false,
  };
}
