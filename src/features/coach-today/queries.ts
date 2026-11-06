import 'server-only';
import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '@/lib/supabase/types';
import { listClients } from '@/features/clients/queries';
import { clientDisplayName } from '@/features/clients/lib';
import { listReviewQueue } from '@/features/forms/queries';
import { addDays, zonedDateString } from '@/features/checkins/week';
import {
  checkinPreview,
  compliancePct,
  daysSinceLastWorkout,
  isCheckinOverdue,
  isWorkoutMissed,
  scheduledCountInWindow,
  sortBySeverity,
  type AttentionItem,
} from './lib';

type DB = SupabaseClient<Database>;

export interface ReviewRow {
  id: string;
  clientId: string;
  clientName: string;
  submittedAt: string;
  preview: string | null;
}

export interface TrainingRow {
  logId: string;
  clientId: string;
  clientName: string;
  workoutTitle: string;
  completedAt: string;
}

export interface CoachTodayData {
  attention: { rows: AttentionItem[]; error: boolean };
  review: { rows: ReviewRow[]; error: boolean };
  training: { rows: TrainingRow[]; prCount: number; error: boolean };
  numbers: { activeClients: number; compliancePct: number | null };
  /** No linked clients of any status — the new-coach setup/empty branch. */
  hasAnyClient: boolean;
}

interface ActiveProgram {
  startDate: string;
  workouts: Array<{ week: number; day: number }>;
}

/** Everything the coach Today dashboard renders, read under the coach's session (RLS scopes to them). */
export async function getCoachToday(
  supabase: DB,
  trainerId: string,
  today: string,
): Promise<CoachTodayData> {
  // Active clients (name + id). Needs-attention and compliance run over active links only.
  const { items: allClients, error: clientsError } = await listClients(supabase, trainerId);
  const activeClients = (allClients ?? []).filter((c) => c.status === 'active');
  const clientName = new Map(
    (allClients ?? []).map((c) => [c.clientId, clientDisplayName(c)] as const),
  );

  const [programs, completed, schedules, submitted, review] = await Promise.all([
    loadActivePrograms(supabase, trainerId, today),
    loadCompletedLogs(supabase, trainerId),
    loadCheckinSchedules(supabase, trainerId),
    loadRecentCheckinSubmissions(supabase, trainerId, today),
    listReviewQueue(supabase, trainerId),
  ]);

  // ── Needs attention: one row per client, highest-severity reason wins. ──
  const attentionRows: AttentionItem[] = [];
  for (const client of activeClients) {
    const name = clientName.get(client.clientId) ?? 'Your client';
    const program = programs.map.get(client.clientId) ?? null;
    const lastCompleted = completed.lastByClient.get(client.clientId) ?? null;
    const missedDays = daysSinceLastWorkout(lastCompleted, program?.startDate ?? null, today);
    if (isWorkoutMissed(missedDays)) {
      attentionRows.push({
        clientId: client.clientId,
        clientName: name,
        kind: 'missed_workout',
        days: missedDays,
      });
      continue;
    }
    const weekday = schedules.weekdayByClient.get(client.clientId);
    if (weekday != null) {
      const lastSubmitted = submitted.lastByClient.get(client.clientId) ?? null;
      const { overdue, daysLate } = isCheckinOverdue(today, weekday, lastSubmitted);
      if (overdue) {
        attentionRows.push({
          clientId: client.clientId,
          clientName: name,
          kind: 'checkin_overdue',
          days: daysLate,
        });
      }
    }
  }

  // ── Numbers: active-client count + 14-day compliance (completed ÷ expected). ──
  let expected = 0;
  let completedInWindow = 0;
  for (const client of activeClients) {
    const program = programs.map.get(client.clientId);
    if (program) {
      expected += scheduledCountInWindow(program.workouts, program.startDate, today);
    }
    completedInWindow += completed.windowCountByClient.get(client.clientId) ?? 0;
  }

  // ── Today's training: workouts completed today + PRs achieved today. ──
  const trainingRows: TrainingRow[] = completed.today.map((row) => ({
    logId: row.logId,
    clientId: row.clientId,
    clientName: clientName.get(row.clientId) ?? 'Your client',
    workoutTitle: row.workoutTitle,
    completedAt: row.completedAt,
  }));
  const pr = await countPrsToday(
    supabase,
    activeClients.map((c) => c.clientId),
    today,
  );

  // ── Check-ins to review (reuse the P1-03 queue; oldest first already). ──
  const reviewRows: ReviewRow[] = (review.items ?? []).map((item) => ({
    id: item.id,
    clientId: item.clientId,
    clientName: item.clientName?.trim() || 'Your client',
    submittedAt: item.submittedAt,
    preview: checkinPreview(item.questions, item.answers),
  }));

  return {
    attention: {
      rows: sortBySeverity(attentionRows),
      error: Boolean(clientsError) || programs.error || completed.error || schedules.error,
    },
    review: { rows: reviewRows, error: Boolean(review.error) },
    training: { rows: trainingRows, prCount: pr.count, error: completed.error || pr.error },
    numbers: {
      activeClients: activeClients.length,
      compliancePct: compliancePct(completedInWindow, expected),
    },
    hasAnyClient: (allClients ?? []).length > 0,
  };
}

/** Active program copies per client: latest start_date wins, with the workouts the scheduler needs. */
async function loadActivePrograms(
  supabase: DB,
  trainerId: string,
  today: string,
): Promise<{ map: Map<string, ActiveProgram>; error: boolean }> {
  const { data, error } = await supabase
    .from('programs')
    .select('client_id, start_date, program_workouts(week, day)')
    .eq('trainer_id', trainerId)
    .eq('is_template', false)
    .not('client_id', 'is', null)
    .not('start_date', 'is', null)
    .lte('start_date', today)
    .order('start_date', { ascending: false });
  if (error) return { map: new Map(), error: true };

  const map = new Map<string, ActiveProgram>();
  for (const row of data ?? []) {
    if (!row.client_id || !row.start_date) continue;
    if (map.has(row.client_id)) continue; // ordered latest-first, so the first seen is the active one
    map.set(row.client_id, {
      startDate: row.start_date,
      workouts: (row.program_workouts ?? []).map((w) => ({ week: w.week, day: w.day })),
    });
  }
  return { map, error: false };
}

interface CompletedLogs {
  /** client_id → the YYYY-MM-DD of their most recent completed workout. */
  lastByClient: Map<string, string>;
  /** client_id → count of completed workouts within the compliance window. */
  windowCountByClient: Map<string, number>;
  today: Array<{ logId: string; clientId: string; workoutTitle: string; completedAt: string }>;
  error: boolean;
}

/** Every completed workout for the trainer's clients, grouped for last-completed / window / today. */
async function loadCompletedLogs(supabase: DB, trainerId: string): Promise<CompletedLogs> {
  const today = zonedDateString(new Date());
  const windowStart = addDays(today, -13);
  const { data, error } = await supabase
    .from('workout_logs')
    .select(
      'id, client_id, scheduled_date, completed_at, program_workout:program_workouts!workout_logs_program_workout_id_fkey(title)',
    )
    .eq('trainer_id', trainerId)
    .eq('status', 'completed')
    .order('completed_at', { ascending: false });
  if (error)
    return { lastByClient: new Map(), windowCountByClient: new Map(), today: [], error: true };

  const lastByClient = new Map<string, string>();
  const windowCountByClient = new Map<string, number>();
  const todayRows: CompletedLogs['today'] = [];

  for (const row of data ?? []) {
    const effective =
      row.scheduled_date ?? (row.completed_at ? zonedDateString(new Date(row.completed_at)) : null);
    if (!effective) continue;
    // Ordered completed_at desc → first row per client is the most recent completed workout.
    if (!lastByClient.has(row.client_id)) lastByClient.set(row.client_id, effective);
    if (effective >= windowStart && effective <= today) {
      windowCountByClient.set(row.client_id, (windowCountByClient.get(row.client_id) ?? 0) + 1);
    }
    if (row.completed_at && zonedDateString(new Date(row.completed_at)) === today) {
      todayRows.push({
        logId: row.id,
        clientId: row.client_id,
        workoutTitle: row.program_workout?.title ?? 'Workout',
        completedAt: row.completed_at,
      });
    }
  }
  return { lastByClient, windowCountByClient, today: todayRows, error: false };
}

/** Active weekly check-in schedules → weekday per client. */
async function loadCheckinSchedules(
  supabase: DB,
  trainerId: string,
): Promise<{ weekdayByClient: Map<string, number>; error: boolean }> {
  const { data, error } = await supabase
    .from('checkin_schedules')
    .select('client_id, weekday')
    .eq('trainer_id', trainerId)
    .eq('active', true);
  if (error) return { weekdayByClient: new Map(), error: true };
  const weekdayByClient = new Map<string, number>();
  for (const row of data ?? []) weekdayByClient.set(row.client_id, row.weekday);
  return { weekdayByClient, error: false };
}

/** Most recent submitted CHECK-IN (not intake) per client in the last ~9 days, as a YYYY-MM-DD date. */
async function loadRecentCheckinSubmissions(
  supabase: DB,
  trainerId: string,
  today: string,
): Promise<{ lastByClient: Map<string, string>; error: boolean }> {
  const since = addDays(today, -9);
  const { data, error } = await supabase
    .from('form_responses')
    .select('client_id, submitted_at, form:forms!form_responses_form_id_fkey(kind)')
    .eq('trainer_id', trainerId)
    .not('submitted_at', 'is', null)
    .gte('submitted_at', `${since}T00:00:00Z`);
  if (error) return { lastByClient: new Map(), error: true };

  const lastByClient = new Map<string, string>();
  for (const row of data ?? []) {
    if (row.form?.kind !== 'checkin' || !row.submitted_at) continue;
    const date = zonedDateString(new Date(row.submitted_at));
    const prev = lastByClient.get(row.client_id);
    if (!prev || date > prev) lastByClient.set(row.client_id, date);
  }
  return { lastByClient, error: false };
}

/** Count of personal records achieved today, across the coach's active clients. */
async function countPrsToday(
  supabase: DB,
  clientIds: string[],
  today: string,
): Promise<{ count: number; error: boolean }> {
  if (clientIds.length === 0) return { count: 0, error: false };
  const since = addDays(today, -1);
  const { data, error } = await supabase
    .from('personal_records')
    .select('id, achieved_at')
    .in('client_id', clientIds)
    .gte('achieved_at', `${since}T00:00:00Z`);
  if (error) return { count: 0, error: true };
  const count = (data ?? []).filter(
    (r) => r.achieved_at && zonedDateString(new Date(r.achieved_at)) === today,
  ).length;
  return { count, error: false };
}
