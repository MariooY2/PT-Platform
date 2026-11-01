// Fixed value lists for the exercise library. The global seed (supabase/seed.sql), the RLS/seed test
// and the UI filters all use these exact values so filtering lines up across the whole library.
// `category` is a DB enum (public.exercise_category); muscle and equipment are text constrained here.

export const EXERCISE_CATEGORIES = [
  'strength',
  'cardio',
  'mobility',
  'plyometric',
  'other',
] as const;
export type ExerciseCategory = (typeof EXERCISE_CATEGORIES)[number];

export const MUSCLES = [
  'chest',
  'back',
  'lats',
  'traps',
  'shoulders',
  'biceps',
  'triceps',
  'forearms',
  'core',
  'quads',
  'hamstrings',
  'glutes',
  'calves',
  'adductors',
  'full_body',
] as const;
export type Muscle = (typeof MUSCLES)[number];

export const EQUIPMENT = [
  'barbell',
  'dumbbell',
  'kettlebell',
  'machine',
  'cable',
  'bodyweight',
  'band',
  'smith_machine',
  'ez_bar',
  'medicine_ball',
  'trx',
  'plate',
  'bench',
] as const;
export type Equipment = (typeof EQUIPMENT)[number];

const TITLE_EXCEPTIONS: Record<string, string> = {
  trx: 'TRX',
  ez_bar: 'EZ bar',
  smith_machine: 'Smith machine',
  medicine_ball: 'Medicine ball',
  full_body: 'Full body',
};

/** Humanize a taxonomy value for display (e.g. "smith_machine" → "Smith machine"). */
export function humanizeTaxonomy(value: string): string {
  if (value in TITLE_EXCEPTIONS) return TITLE_EXCEPTIONS[value];
  const spaced = value.replace(/_/g, ' ');
  return spaced.charAt(0).toUpperCase() + spaced.slice(1);
}
