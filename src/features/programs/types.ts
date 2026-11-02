import type { Database } from '@/lib/supabase/types';

export type Program = Database['public']['Tables']['programs']['Row'];
export type ProgramWorkout = Database['public']['Tables']['program_workouts']['Row'];
export type WorkoutExercise = Database['public']['Tables']['workout_exercises']['Row'];
export type PrescribedSet = Database['public']['Tables']['prescribed_sets']['Row'];

// A program row plus a count of workouts and (for templates) how many client copies use it.
export type ProgramListItem = Program & { workout_count: number; used_by: number };

// A client's assigned copy, as the client-profile Program tab lists it.
export interface ClientProgramItem {
  id: string;
  title: string;
  weeks: number;
  status: Program['status'];
  startDate: string | null;
  workoutCount: number;
}
