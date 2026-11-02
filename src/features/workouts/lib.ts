import { addDays, format, parseISO } from 'date-fns';

/**
 * The calendar date of a program workout: start_date + (week-1)*7 + (day-1) days, as `yyyy-MM-dd`.
 * Pure string→Date→string so it compares cleanly against a client's "today" (same format, no TZ math).
 */
export function scheduledDateFor(startDate: string, week: number, day: number): string {
  return format(addDays(parseISO(startDate), (week - 1) * 7 + (day - 1)), 'yyyy-MM-dd');
}

/** The minimal shape the scheduler needs from a program workout. */
export interface SchedulableWorkout {
  week: number;
  day: number;
}

/** The one workout in a program whose calendar date equals `date`, or null (a rest day). */
export function findScheduledForDate<T extends SchedulableWorkout>(
  workouts: T[],
  startDate: string,
  date: string,
): T | null {
  return workouts.find((w) => scheduledDateFor(startDate, w.week, w.day) === date) ?? null;
}

/** The soonest workout strictly after `date` (for the rest-day "Next: …" line), or null. */
export function nextScheduledAfter<T extends SchedulableWorkout>(
  workouts: T[],
  startDate: string,
  date: string,
): { workout: T; date: string } | null {
  const upcoming = workouts
    .map((workout) => ({ workout, date: scheduledDateFor(startDate, workout.week, workout.day) }))
    .filter((x) => x.date > date)
    .sort((a, b) => a.date.localeCompare(b.date));
  return upcoming[0] ?? null;
}

/**
 * Epley estimated 1RM = weight × (1 + reps/30). Pure, and matches the server-side PR trigger exactly,
 * so a unit test pins the formula. PRs are detected server-side; this helper never writes one.
 */
export function epley(weightKg: number, reps: number): number {
  return weightKg * (1 + reps / 30);
}

export interface Prescription {
  repsMin: number | null;
  repsMax: number | null;
  weightKg: number | null;
}

export interface LastPerformance {
  weightKg: number | null;
  reps: number | null;
}

/**
 * The prefill for one set's inputs. Weight: the prescription, else last time's. Reps: the top of the
 * prescribed range, else last time's. Returned as strings ready for a controlled input ('' = blank).
 */
export function prefillSet(
  prescribed: Prescription,
  last?: LastPerformance | null,
): { weight: string; reps: string } {
  const weight = prescribed.weightKg ?? last?.weightKg ?? null;
  const reps = prescribed.repsMax ?? prescribed.repsMin ?? last?.reps ?? null;
  return {
    weight: weight == null ? '' : String(weight),
    reps: reps == null ? '' : String(reps),
  };
}

/** Milliseconds left on a rest timer whose end is `endsAt` (epoch ms); never negative. */
export function restRemainingMs(endsAt: number, now: number): number {
  return Math.max(0, endsAt - now);
}
