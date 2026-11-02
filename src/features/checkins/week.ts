/**
 * Pure date helpers for weekly check-in due-generation. No Supabase, no session — unit-testable.
 *
 * All dates are handled as `YYYY-MM-DD` strings in a fixed timezone (Asia/Beirut, docs/platform.md
 * §9), so lexical string comparison equals chronological comparison and there is no UTC drift.
 * Weekdays follow `Date.getDay()`: 0 = Sunday … 6 = Saturday.
 */
export const CHECKIN_TIME_ZONE = 'Asia/Beirut';

/** The `YYYY-MM-DD` calendar date of an instant, in the given timezone. */
export function zonedDateString(instant: Date, timeZone: string = CHECKIN_TIME_ZONE): string {
  // en-CA formats as YYYY-MM-DD.
  return new Intl.DateTimeFormat('en-CA', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(instant);
}

/** The weekday (0 = Sunday … 6 = Saturday) of a `YYYY-MM-DD` date string. */
export function weekdayOf(date: string): number {
  // Anchor at UTC noon so no timezone can shift the calendar day.
  return new Date(`${date}T12:00:00Z`).getUTCDay();
}

/** A `YYYY-MM-DD` date string `days` calendar days from `date` (days may be negative). */
export function addDays(date: string, days: number): string {
  const d = new Date(`${date}T12:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

/**
 * The ISO week (Monday .. Sunday) that contains `date`, as inclusive `YYYY-MM-DD` bounds.
 */
export function isoWeekRange(date: string): { start: string; end: string } {
  const dow = weekdayOf(date); // 0 = Sun … 6 = Sat
  const daysFromMonday = (dow + 6) % 7; // Mon → 0, …, Sun → 6
  const start = addDays(date, -daysFromMonday);
  return { start, end: addDays(start, 6) };
}

/**
 * The calendar date within `date`'s ISO week whose weekday equals `weekday` (0..6).
 * e.g. for a Wednesday `date` and weekday 1 (Monday) this returns that week's Monday.
 */
export function scheduledDateInWeek(date: string, weekday: number): string {
  const { start } = isoWeekRange(date); // Monday
  const offsetFromMonday = (weekday + 6) % 7; // Sun(0) → 6, Mon(1) → 0, … Sat(6) → 5
  return addDays(start, offsetFromMonday);
}

/**
 * Whether a schedule's weekday has already arrived (today or earlier) this ISO week, and the date it
 * falls on. "Arrived" means the scheduled date is <= today, so a check-in materialises from its
 * weekday onward, not before.
 */
export function dueThisWeek(
  today: string,
  weekday: number,
): { due: boolean; dueDate: string; weekStart: string; weekEnd: string } {
  const { start: weekStart, end: weekEnd } = isoWeekRange(today);
  const dueDate = scheduledDateInWeek(today, weekday);
  return { due: dueDate <= today, dueDate, weekStart, weekEnd };
}
