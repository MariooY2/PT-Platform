import { z } from 'zod';

// Format-only id check. The seed's deterministic uuids use zero variant bits that z.uuid() rejects;
// the real guard is RLS + the session client (ids are never trusted raw from the browser).
export const uuidLike = z
  .string()
  .regex(
    /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/,
    'Invalid id',
  );

// Start (or resume) today's scheduled workout. The programWorkoutId must be today's scheduled workout —
// the server re-checks that against the active assignment; trainer_id comes from the program, never here.
export const startWorkoutSchema = z.object({
  programWorkoutId: uuidLike,
  clientGeneratedId: uuidLike,
});
export type StartWorkoutInput = z.infer<typeof startWorkoutSchema>;

// Log (or edit, or undo) one set. The exercise is derived server-side from the workout_exercise; reps,
// weight and RPE are range-checked here and again by the table's CHECK constraints.
export const logSetSchema = z.object({
  workoutLogId: uuidLike,
  workoutExerciseId: uuidLike,
  setNumber: z.coerce.number().int().min(1, 'Invalid set.').max(99),
  reps: z.coerce.number().int().min(0, 'Reps must be 0 or more.').max(1000).nullable(),
  weightKg: z.coerce.number().min(0, 'Weight must be 0 or more.').max(1000).nullable(),
  rpe: z.coerce.number().min(1).max(10).nullable(),
  completed: z.boolean(),
  clientGeneratedId: uuidLike,
});
export type LogSetInput = z.infer<typeof logSetSchema>;

// Finish the session with a 1–10 RPE and an optional note to the coach.
export const finishWorkoutSchema = z.object({
  workoutLogId: uuidLike,
  sessionRpe: z.coerce.number().min(1, 'Rate the session.').max(10).nullable(),
  note: z.string().trim().max(1000).optional(),
});
export type FinishWorkoutInput = z.infer<typeof finishWorkoutSchema>;
