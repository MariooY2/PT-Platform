import { createClient } from '@/lib/supabase/server';
import { Skeleton } from '@/components/ui/skeleton';
import { ErrorState } from '@/components/shared/states';
import { todayFor } from '@/features/habits/lib';
import { getTodayState } from '../queries';
import { TodayCard } from './today-card';

function Heading() {
  return (
    <h2 id="today-workout-heading" className="sr-only">
      Today’s workout
    </h2>
  );
}

/** Skeleton shaped like the workout card; the Suspense fallback so nothing shifts. */
export function TodayWorkoutSkeleton() {
  return (
    <section aria-labelledby="today-workout-heading" className="space-y-4">
      <Heading />
      <div className="space-y-4 rounded-xl border bg-card p-4" aria-hidden>
        <div className="space-y-2">
          <Skeleton className="h-4 w-24" />
          <Skeleton className="h-5 w-40" />
          <Skeleton className="h-4 w-56" />
        </div>
        <Skeleton className="h-12 w-full rounded-md" />
      </div>
    </section>
  );
}

/**
 * Reads the client's Today state (scheduled / in-progress / completed / rest / no-program) and renders
 * the card. Rendered inside <Suspense> on Today, so the session read is dynamic without a top-level
 * `await connection()` here (L-002).
 */
export async function TodayWorkoutSection({ clientId }: { clientId: string }) {
  const supabase = await createClient();
  const { data: profile } = await supabase
    .from('profiles')
    .select('timezone')
    .eq('id', clientId)
    .maybeSingle();
  const today = todayFor(profile?.timezone);

  const { state, error } = await getTodayState(supabase, clientId, today);
  if (error || !state) {
    return (
      <section aria-labelledby="today-workout-heading" className="space-y-4">
        <Heading />
        <ErrorState
          title="Couldn’t load today’s workout"
          description="Check your connection and try again."
        />
      </section>
    );
  }

  return (
    <section aria-labelledby="today-workout-heading" className="space-y-4">
      <Heading />
      <TodayCard state={state} />
    </section>
  );
}
