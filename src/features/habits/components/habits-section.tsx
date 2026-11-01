import { createClient } from '@/lib/supabase/server';
import { Skeleton } from '@/components/ui/skeleton';
import { ErrorState } from '@/components/shared/states';
import { listActiveHabitsWithToday } from '../queries';
import { todayFor } from '../lib';
import { HabitsToday } from './habits-today';

function HabitsHeading() {
  return (
    <h2 id="habits-heading" className="text-base font-semibold">
      Habits
    </h2>
  );
}

/** Skeleton shaped like the habit list; used as the Suspense fallback so nothing shifts. */
export function HabitsSkeleton() {
  return (
    <section aria-labelledby="habits-heading" className="space-y-3">
      <HabitsHeading />
      <div className="space-y-2" aria-hidden>
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="flex min-h-11 items-center gap-3 rounded-md border px-3 py-2">
            <Skeleton className="size-6 rounded-full" />
            <Skeleton className="h-4 w-1/3" />
          </div>
        ))}
      </div>
    </section>
  );
}

/**
 * Reads the client's active habits and today's tick state, then renders the interactive list or the
 * empty/error state. Rendered inside <Suspense> on Today, so the cookie/session read is dynamic
 * without a top-level `await connection()` here (L-002).
 */
export async function HabitsSection({ clientId }: { clientId: string }) {
  const supabase = await createClient();
  const { data: profile } = await supabase
    .from('profiles')
    .select('timezone')
    .eq('id', clientId)
    .maybeSingle();
  const today = todayFor(profile?.timezone);

  const { items, error } = await listActiveHabitsWithToday(supabase, clientId, today);

  if (error || items === null) {
    return (
      <section aria-labelledby="habits-heading" className="space-y-3">
        <HabitsHeading />
        <ErrorState
          title="Couldn’t load your habits"
          description="Check your connection and try again."
        />
      </section>
    );
  }

  if (items.length === 0) {
    return (
      <section aria-labelledby="habits-heading" className="space-y-3">
        <HabitsHeading />
        <p className="rounded-md border border-dashed px-3 py-4 text-sm text-muted-foreground">
          Habits your coach sets for you appear here to tick off each day.
        </p>
      </section>
    );
  }

  return <HabitsToday habits={items} />;
}
