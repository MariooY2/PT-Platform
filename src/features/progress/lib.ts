import { addDays, eachDayOfInterval, endOfMonth, format, parseISO, startOfMonth } from 'date-fns';
import { epley } from '@/features/workouts/lib';

// ---------------------------------------------------------------------------
// Strength: e1RM over time (per lift) + the 6-week change.
// ---------------------------------------------------------------------------

/** One completed, weighted set. `date` is the session's calendar date (yyyy-MM-dd). */
export interface CompletedSet {
  date: string;
  weightKg: number;
  reps: number;
}

export interface SeriesPoint {
  date: string;
  value: number;
}

/**
 * The best Epley e1RM per calendar date, ascending by date. Matches the server PR trigger's formula
 * exactly (via `epley`), so the line and the PR values tell the same story. Sets with no weight/reps
 * are dropped by the caller; this assumes weightKg ≥ 0 and reps ≥ 1.
 */
export function e1rmSeries(sets: CompletedSet[]): SeriesPoint[] {
  const bestByDate = new Map<string, number>();
  for (const s of sets) {
    if (s.reps <= 0) continue;
    const value = epley(s.weightKg, s.reps);
    const prev = bestByDate.get(s.date);
    if (prev === undefined || value > prev) bestByDate.set(s.date, value);
  }
  return [...bestByDate.entries()]
    .map(([date, value]) => ({ date, value }))
    .sort((a, b) => a.date.localeCompare(b.date));
}

export interface ChangeResult {
  latest: number | null;
  baseline: number | null;
  delta: number | null;
}

/**
 * Latest series value and its change over the last `weeks`. The baseline is the most recent point on
 * or before (today − weeks·7); if there is none that old, the earliest point stands in. With fewer
 * than two points there is no change to show (delta = null → "First session logged" in the UI).
 */
export function sixWeekChange(series: SeriesPoint[], today: string, weeks = 6): ChangeResult {
  if (series.length === 0) return { latest: null, baseline: null, delta: null };
  const latest = series[series.length - 1].value;
  if (series.length === 1) return { latest, baseline: null, delta: null };

  const cutoff = format(addDays(parseISO(today), -weeks * 7), 'yyyy-MM-dd');
  const before = series.filter((p) => p.date <= cutoff);
  const baselinePoint = before.length > 0 ? before[before.length - 1] : series[0];
  // If the only candidate is the latest point itself, there is no meaningful change.
  if (baselinePoint === series[series.length - 1]) return { latest, baseline: null, delta: null };
  return { latest, baseline: baselinePoint.value, delta: latest - baselinePoint.value };
}

// ---------------------------------------------------------------------------
// Body: daily weight points + a 7-day trailing average line.
// ---------------------------------------------------------------------------

export interface WeightRow {
  measuredOn: string;
  weightKg: number | null;
}

export interface WeightPoint {
  date: string;
  weightKg: number;
}

/**
 * One weight point per day (the latest measurement for that day wins), ascending by date. Days without
 * a weight are skipped. No unique constraint on (client, measured_on) exists, so de-duping is the UI's job.
 */
export function dailyWeights(rows: WeightRow[]): WeightPoint[] {
  const byDate = new Map<string, number>();
  // rows are consumed in order; later rows for the same day overwrite earlier ones. The caller passes
  // them oldest-first, so the last-seen value is the most recently measured for that day.
  for (const r of rows) {
    if (r.weightKg == null) continue;
    byDate.set(r.measuredOn, r.weightKg);
  }
  return [...byDate.entries()]
    .map(([date, weightKg]) => ({ date, weightKg }))
    .sort((a, b) => a.date.localeCompare(b.date));
}

/**
 * A 7-day trailing average line: each point averages every daily weight within the 6 days up to and
 * including that date. Smooths day-to-day noise (water, food) the way the spec's average line should.
 */
export function rolling7(points: WeightPoint[]): SeriesPoint[] {
  return points.map((p) => {
    const windowStart = format(addDays(parseISO(p.date), -6), 'yyyy-MM-dd');
    const inWindow = points.filter((q) => q.date >= windowStart && q.date <= p.date);
    const avg = inWindow.reduce((sum, q) => sum + q.weightKg, 0) / inWindow.length;
    return { date: p.date, value: avg };
  });
}

/** Latest minus earliest weight over the window (for the body-trend summary), or null with <2 points. */
export function weightChange(points: WeightPoint[]): {
  latest: number | null;
  delta: number | null;
} {
  if (points.length === 0) return { latest: null, delta: null };
  const latest = points[points.length - 1].weightKg;
  if (points.length === 1) return { latest, delta: null };
  return { latest, delta: latest - points[0].weightKg };
}

// ---------------------------------------------------------------------------
// Calendar: per-day status + month compliance.
// ---------------------------------------------------------------------------

export type DayStatus = 'done' | 'partial' | 'missed' | 'upcoming';

export type WorkoutLogStatus = 'in_progress' | 'completed' | 'partial' | 'skipped';

export interface LogForDay {
  date: string;
  status: WorkoutLogStatus;
}

/**
 * The status of every day that is either scheduled by a program or has a workout log, keyed by date.
 *   completed log → done · partial/in_progress log → partial
 *   scheduled, past, no completing log (or skipped) → missed · scheduled today-or-later → upcoming
 * Pure so the month view and the compliance line are both deterministic in tests.
 */
export function dayStatuses(
  scheduledDates: string[],
  logs: LogForDay[],
  today: string,
): Map<string, DayStatus> {
  const rank = (s: WorkoutLogStatus) =>
    s === 'completed' ? 3 : s === 'partial' || s === 'in_progress' ? 2 : 1;
  const logByDate = new Map<string, WorkoutLogStatus>();
  for (const l of logs) {
    // Keep the "best" log per day: completed beats partial/in_progress beats skipped.
    const prev = logByDate.get(l.date);
    if (prev === undefined || rank(l.status) > rank(prev)) logByDate.set(l.date, l.status);
  }

  const scheduled = new Set(scheduledDates);
  const result = new Map<string, DayStatus>();
  const dates = new Set<string>([...scheduledDates, ...logByDate.keys()]);
  for (const date of dates) {
    const log = logByDate.get(date);
    if (log === 'completed') result.set(date, 'done');
    else if (log === 'partial' || log === 'in_progress') result.set(date, 'partial');
    else if (scheduled.has(date)) result.set(date, date >= today ? 'upcoming' : 'missed');
    else if (log === 'skipped') result.set(date, 'missed');
  }
  return result;
}

export interface Compliance {
  done: number;
  partial: number;
  missed: number;
  total: number;
  pct: number;
  words: string;
}

/** Month compliance from the day statuses (upcoming days don't count yet). */
export function compliance(statuses: DayStatus[]): Compliance {
  const done = statuses.filter((s) => s === 'done').length;
  const partial = statuses.filter((s) => s === 'partial').length;
  const missed = statuses.filter((s) => s === 'missed').length;
  const total = done + partial + missed;
  const pct = total === 0 ? 0 : Math.round((done / total) * 100);
  const words =
    total === 0
      ? 'No workouts scheduled this month'
      : `You did ${done} of ${total} ${total === 1 ? 'workout' : 'workouts'} — ${pct}%`;
  return { done, partial, missed, total, pct, words };
}

/**
 * The weeks of a month as a grid (Monday-first), each week a row of 7 yyyy-MM-dd strings. Leading and
 * trailing days from adjacent months fill the row so the calendar is always a full rectangle; the UI
 * dims days whose month differs. `month` is 1-based.
 */
export function monthMatrix(year: number, month: number): string[][] {
  const first = startOfMonth(new Date(year, month - 1, 1));
  const last = endOfMonth(first);
  // Monday-first: how many days to back up to reach the week's Monday.
  const mondayOffset = (first.getDay() + 6) % 7;
  const gridStart = addDays(first, -mondayOffset);
  const trailing = (7 - ((last.getDay() + 6) % 7) - 1 + 7) % 7;
  const gridEnd = addDays(last, trailing);
  const days = eachDayOfInterval({ start: gridStart, end: gridEnd }).map((d) =>
    format(d, 'yyyy-MM-dd'),
  );
  const weeks: string[][] = [];
  for (let i = 0; i < days.length; i += 7) weeks.push(days.slice(i, i + 7));
  return weeks;
}

// ---------------------------------------------------------------------------
// Inline-SVG line chart scaling (no chart library).
// ---------------------------------------------------------------------------

export interface ScaledPoint {
  x: number;
  y: number;
  point: SeriesPoint;
}

export interface ScaledSeries {
  scaled: ScaledPoint[];
  path: string;
}

/**
 * Map a time series into a `viewBox` of `width`×`height` with `pad` inside every edge. x is linear in
 * calendar time (so gaps read true), y is linear in value with a small headroom so the line never
 * touches an edge. Returns the scaled points (for dots + the direct label) and an SVG `path` string.
 * A single point is centred. Pure, so the chart is testable without a DOM.
 */
export function scaleSeries(
  points: SeriesPoint[],
  width: number,
  height: number,
  pad = 8,
): ScaledSeries {
  if (points.length === 0) return { scaled: [], path: '' };

  const times = points.map((p) => parseISO(p.date).getTime());
  const values = points.map((p) => p.value);
  const minT = Math.min(...times);
  const maxT = Math.max(...times);
  const minV = Math.min(...values);
  const maxV = Math.max(...values);
  const spanT = maxT - minT || 1;
  const spanV = maxV - minV || 1;
  const innerW = width - pad * 2;
  const innerH = height - pad * 2;

  const scaled = points.map((p, i) => {
    const x = points.length === 1 ? width / 2 : pad + ((times[i] - minT) / spanT) * innerW;
    // headroom: keep a 5% margin top and bottom inside the inner box.
    const t = (p.value - minV) / spanV;
    const y = pad + innerH * (1 - (0.05 + t * 0.9));
    return { x, y, point: p };
  });

  const path = scaled
    .map((s, i) => `${i === 0 ? 'M' : 'L'}${s.x.toFixed(2)} ${s.y.toFixed(2)}`)
    .join(' ');
  return { scaled, path };
}
