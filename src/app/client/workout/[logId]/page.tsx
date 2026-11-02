import { connection } from 'next/server';
import { notFound, redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { getWorkoutForPlayer } from '@/features/workouts/queries';
import { WorkoutPlayer } from '@/features/workouts/components/workout-player';

// Reads the session + a dynamic param, so the route renders dynamically (Next 16 cacheComponents).
// This route lives OUTSIDE the (app) group: a focused flow with no bottom nav and no intake-gate
// redirect mid-set.
export const instant = false;

export default async function WorkoutPlayerPage({
  params,
}: {
  params: Promise<{ logId: string }>;
}) {
  // Force dynamic rendering before the Supabase session read (L-002).
  await connection();
  const { logId } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const data = await getWorkoutForPlayer(supabase, user.id, logId);
  if (!data) notFound();

  return <WorkoutPlayer data={data} />;
}
