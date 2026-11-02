import type { Database } from '@/lib/supabase/types';

export type WorkoutLogStatus = Database['public']['Enums']['workout_log_status'];
export type PrescribedSetType = Database['public']['Enums']['prescribed_set_type'];

/** The Today card's summary of a scheduled workout (one program workout). */
export interface TodayWorkoutCard {
  programWorkoutId: string;
  assignmentId: string;
  scheduledDate: string;
  week: number;
  day: number;
  title: string;
  exerciseCount: number;
  exerciseNames: string[];
}

/** The Today screen's single state. Drives both the card and the primary action. */
export type TodayState =
  | { kind: 'no-program' }
  | { kind: 'rest-day'; next: { title: string; date: string } | null }
  | { kind: 'scheduled'; workout: TodayWorkoutCard }
  | { kind: 'in-progress'; workout: TodayWorkoutCard; logId: string; setsDone: number }
  | {
      kind: 'completed';
      workout: TodayWorkoutCard;
      logId: string;
      setsDone: number;
      sessionRpe: number | null;
    };

export interface PrescribedSetView {
  setNumber: number;
  setType: PrescribedSetType;
  repsMin: number | null;
  repsMax: number | null;
  weightKg: number | null;
  rpe: number | null;
  durationSec: number | null;
  distanceM: number | null;
}

/** A set the client did in a prior session, for the "Last time" column. */
export interface PreviousSetView {
  setNumber: number;
  weightKg: number | null;
  reps: number | null;
}

/** A set_log already saved for this workout (resume / edit). */
export interface ExistingSetView {
  workoutExerciseId: string | null;
  setNumber: number;
  clientGeneratedId: string;
  reps: number | null;
  weightKg: number | null;
  rpe: number | null;
  completed: boolean;
}

export interface PlayerExercise {
  workoutExerciseId: string;
  exerciseId: string;
  name: string;
  videoUrl: string | null;
  instructions: string | null;
  coachNotes: string | null;
  restSeconds: number | null;
  groupLabel: string | null;
  prescribedSets: PrescribedSetView[];
  previous: PreviousSetView[];
  /** client_generated_ids of this log's sets that are the client's current personal records. */
  prClientGeneratedIds: string[];
}

export interface WorkoutPlayerData {
  logId: string;
  title: string;
  week: number;
  day: number;
  status: WorkoutLogStatus;
  startedAt: string;
  completedAt: string | null;
  sessionRpe: number | null;
  clientNotes: string | null;
  exercises: PlayerExercise[];
  existingSets: ExistingSetView[];
}
