import { format, nextMonday } from 'date-fns';

export const DAY_LABELS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'] as const;

/** The minimal set shape the summary needs (a subset of a prescribed_sets row). */
export interface PreviewSet {
  set_number: number;
  reps_min: number | null;
  reps_max: number | null;
  weight_kg: number | null;
  percent_1rm: number | null;
  rpe: number | null;
  duration_sec: number | null;
}

/**
 * A one-line prescription summary for an exercise ("3 × 8–10 · 80% · RPE 8"). Shared by the builder
 * row and the read-only assign preview so both read identically. Pure — unit-tested in isolation.
 */
export function setSummary(sets: PreviewSet[]): string {
  const first = sets.slice().sort((a, b) => a.set_number - b.set_number)[0];
  if (!first) return 'No sets yet';
  const count = sets.length;
  if (first.duration_sec) return `${count} × ${first.duration_sec}s`;
  const reps =
    first.reps_max && first.reps_max !== first.reps_min
      ? `${first.reps_min}–${first.reps_max}`
      : `${first.reps_min ?? '—'}`;
  const load = first.weight_kg
    ? ` · ${first.weight_kg} kg`
    : first.percent_1rm
      ? ` · ${first.percent_1rm}%`
      : '';
  const rpe = first.rpe ? ` · RPE ${first.rpe}` : '';
  return `${count} × ${reps}${load}${rpe}`;
}

/** The default assignment start date: the next Monday, as a `yyyy-MM-dd` string. */
export function defaultStartDate(from: Date = new Date()): string {
  return format(nextMonday(from), 'yyyy-MM-dd');
}

/**
 * For each template id, how many client copies point at it (count by `source_program_id`). Computed in
 * JS from the trainer's own rows — a self-referential PostgREST embed is direction-ambiguous.
 */
export function usedByCounts(
  programs: Array<{ id: string; is_template: boolean; source_program_id: string | null }>,
): Record<string, number> {
  const counts: Record<string, number> = {};
  for (const p of programs) {
    if (!p.is_template && p.source_program_id) {
      counts[p.source_program_id] = (counts[p.source_program_id] ?? 0) + 1;
    }
  }
  return counts;
}

/** The success copy after an assign (docs/ui/copy.md: "Program assigned to Rami and 2 others."). */
export function assignedToLabel(names: string[]): string {
  const [first, ...rest] = names;
  if (!first) return 'Program assigned.';
  if (rest.length === 0) return `Program assigned to ${first}.`;
  if (rest.length === 1) return `Program assigned to ${first} and 1 other.`;
  return `Program assigned to ${first} and ${rest.length} others.`;
}
