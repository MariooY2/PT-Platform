import { createClient } from '@/lib/supabase/server';
import { ExerciseLibrary } from '@/features/exercises/components/exercise-library';

// Reads searchParams and the session (cookies), so the route renders dynamically (Next 16 cacheComponents).
export const instant = false;

export default async function CoachExercisesPage({
  searchParams,
}: {
  searchParams: Promise<{ state?: string }>;
}) {
  const { state } = await searchParams;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // RLS returns the global library (trainer_id null) plus this coach's own exercises only.
  const { data, error } = await supabase
    .from('exercises')
    .select(
      'id, trainer_id, name, primary_muscle, secondary_muscles, equipment, category, video_url, instructions',
    )
    .eq('is_archived', false)
    .order('name');

  return (
    <ExerciseLibrary
      key={state ?? 'default'}
      exercises={data ?? []}
      userId={user?.id ?? null}
      hadError={Boolean(error)}
      forcedState={state}
    />
  );
}
