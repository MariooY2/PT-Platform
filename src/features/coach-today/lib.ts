/**
 * Pure helpers for the coach Today dashboard (docs/ui/screens/coach.md, docs/features.md §7.15).
 *
 * No Supabase and no session: everything here is unit-testable and shared by the queries and the
 * UI. Dates are `YYYY-MM-DD` strings in a fixed timezone (Asia/Beirut), like the check-in helpers,
 * so lexical comparison equals chronological comparison and there is no UTC drift.
 */
import { differenceInCalendarDays, parseISO } from 'date-fns';
import { addDays, weekdayOf } from '@/features/checkins/week';
import { scheduledDateFor, type SchedulableWorkout } from '@/features/workouts/lib';
import { formatWeightValue } from '@/lib/format';
import type { Question } from '@/features/forms/schemas';

/** Days to missed-workout / overdue-check-in and the compliance window. */
export const MISSED_WORKOUT_DAYS = 5;
export const CHECKIN_OVERDUE_DAYS = 2;
export const COMPLIANCE_WINDOW_DAYS = 14;

/** Whole calendar days between two `YYYY-MM-DD` dates (positive when `to` is after `from`). */
export function daysBetween(from: string, to: string): number {
  return differenceInCalendarDays(parseISO(to), parseISO(from));
}

// ── Needs attention ────────────────────────────────────────────────────────

/** The two v1 severities, highest priority first (the sort key order). */
export type AttentionKind = 'missed_workout' | 'checkin_overdue';

const SEVERITY_ORDER: Record<AttentionKind, number> = {
  missed_workout: 0,
  checkin_overdue: 1,
};

export interface AttentionItem {
  clientId: string;
  clientName: string;
  kind: AttentionKind;
  /** The number the reason states — days with no workout, or days the check-in is late. */
  days: number;
}

/** The reason line, in words with the number (copy.md: "No workout in 6 days", "Check-in 3 days late"). */
export function attentionReason(item: Pick<AttentionItem, 'kind' | 'days'>): string {
  const plural = (n: number) => (n === 1 ? 'day' : 'days');
  if (item.kind === 'missed_workout') return `No workout in ${item.days} ${plural(item.days)}`;
  return `Check-in ${item.days} ${plural(item.days)} late`;
}

/** Sort needs-attention rows: by severity (missed > overdue), then by the number, most urgent first. */
export function sortBySeverity<T extends { kind: AttentionKind; days: number }>(rows: T[]): T[] {
  return [...rows].sort(
    (a, b) => SEVERITY_ORDER[a.kind] - SEVERITY_ORDER[b.kind] || b.days - a.days,
  );
}

/**
 * Days since a client's last completed workout. Falls back to days since the program started when
 * they have an active program but have never completed a workout, so a new-and-idle client surfaces.
 * Returns null when the client has no active program (nothing to be missed).
 */
export function daysSinceLastWorkout(
  lastCompletedDate: string | null,
  programStartDate: string | null,
  today: string,
): number | null {
  if (!programStartDate) return null;
  const since = lastCompletedDate ?? programStartDate;
  return Math.max(0, daysBetween(since, today));
}

/** True when a client with an active program is ≥ MISSED_WORKOUT_DAYS days without a workout. */
export function isWorkoutMissed(days: number | null): days is number {
  return days != null && days >= MISSED_WORKOUT_DAYS;
}

// ── Check-in overdue ─────────────────────────────────────────────────────────

/** The most recent date on or before `today` whose weekday equals `weekday` (0 = Sun … 6 = Sat). */
export function mostRecentScheduledOn(today: string, weekday: number): string {
  const back = (weekdayOf(today) - weekday + 7) % 7;
  return addDays(today, -back);
}

/**
 * Whether a client's weekly check-in is overdue: its most recent scheduled occurrence was at least
 * CHECKIN_OVERDUE_DAYS ago and nothing has been submitted since that occurrence.
 *
 * This reads the "scheduled weekday" rule by its most recent occurrence rather than strictly "this
 * ISO week" (docs wording): the occurrence-based rule holds every day, where "this ISO week" leaves a
 * Mon/Tue blind spot in which no weekday can be ≥2 days past. Recorded as a deferral/decision.
 */
export function isCheckinOverdue(
  today: string,
  weekday: number,
  lastSubmittedDate: string | null,
): { overdue: boolean; daysLate: number } {
  const occurrence = mostRecentScheduledOn(today, weekday);
  const daysLate = daysBetween(occurrence, today);
  if (daysLate < CHECKIN_OVERDUE_DAYS) return { overdue: false, daysLate };
  if (lastSubmittedDate && lastSubmittedDate >= occurrence) return { overdue: false, daysLate };
  return { overdue: true, daysLate };
}

// ── Compliance ───────────────────────────────────────────────────────────────

/** The first day of the compliance window: `COMPLIANCE_WINDOW_DAYS` inclusive, ending today. */
export function complianceWindowStart(
  today: string,
  days: number = COMPLIANCE_WINDOW_DAYS,
): string {
  return addDays(today, -(days - 1));
}

/**
 * How many of a program's workouts were scheduled within the window `[start, today]` (inclusive).
 * Expanded from each workout's week/day against the program's start date — the "expected" workouts.
 */
export function scheduledCountInWindow<T extends SchedulableWorkout>(
  workouts: T[],
  programStartDate: string,
  today: string,
  days: number = COMPLIANCE_WINDOW_DAYS,
): number {
  const start = complianceWindowStart(today, days);
  let count = 0;
  for (const w of workouts) {
    const date = scheduledDateFor(programStartDate, w.week, w.day);
    if (date >= start && date <= today) count += 1;
  }
  return count;
}

/**
 * Compliance over the window: completed workouts ÷ expected (scheduled) workouts, as a rounded
 * percentage. Null when nothing was expected, so the UI shows "—" rather than a misleading 0% or
 * 100%. Capped at 100 (a client can complete an unscheduled extra session).
 */
export function compliancePct(completed: number, expected: number): number | null {
  if (expected <= 0) return null;
  return Math.min(100, Math.round((completed / expected) * 100));
}

// ── Check-in preview ───────────────────────────────────────────────────────

const MAX_PREVIEW = 60;

/**
 * A one-line preview of a submitted check-in's most notable answer: a low energy/mood score first,
 * then a weight, then the first free-text answer. Null when nothing readable is present.
 */
export function checkinPreview(
  questions: Question[],
  answers: Record<string, unknown>,
): string | null {
  // A low scale answer is the most worth surfacing (low energy, poor sleep).
  for (const q of questions) {
    if (q.type !== 'scale') continue;
    const v = answers[q.id];
    if (typeof v === 'number' && v <= 4) return `${q.label} ${v}/10`;
  }
  for (const q of questions) {
    if (q.type !== 'weight') continue;
    const v = answers[q.id];
    if (typeof v === 'number') {
      const { value, unit } = formatWeightValue(v);
      return `${q.label} ${value} ${unit}`;
    }
  }
  for (const q of questions) {
    if (q.type !== 'text' && q.type !== 'long_text') continue;
    const v = answers[q.id];
    if (typeof v === 'string' && v.trim()) {
      const s = v.trim();
      return s.length > MAX_PREVIEW ? `${s.slice(0, MAX_PREVIEW - 1)}…` : s;
    }
  }
  return null;
}
