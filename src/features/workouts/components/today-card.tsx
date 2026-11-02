'use client';

import { useTransition } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { CalendarCheck, CalendarDays, CheckCircle2, Dumbbell } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Toaster } from '@/components/ui/sonner';
import { EmptyState } from '@/components/shared/states';
import { RelativeDate } from '@/components/format';
import { startWorkoutAction } from '../actions';
import type { TodayState, TodayWorkoutCard } from '../types';

/** The shared visual card: "Week N · Day N", the title, the exercise list. */
function WorkoutCardShell({
  workout,
  children,
  tone = 'default',
}: {
  workout: TodayWorkoutCard;
  children: React.ReactNode;
  tone?: 'default' | 'success';
}) {
  const names = workout.exerciseNames.slice(0, 4).join(', ');
  const more = workout.exerciseNames.length > 4 ? '…' : '';
  return (
    <section
      aria-labelledby="today-workout-title"
      className="space-y-4 rounded-xl border bg-card p-4"
    >
      <div className="space-y-1">
        <p className="text-sm num text-muted-foreground">
          Week {workout.week} · Day {workout.day}
        </p>
        <h2 id="today-workout-title" className="text-lg font-semibold">
          {workout.title}
        </h2>
        <p className="text-sm text-muted-foreground">
          {workout.exerciseCount} {workout.exerciseCount === 1 ? 'exercise' : 'exercises'}
          {names && <span> · {names}</span>}
          {more}
        </p>
      </div>
      <div className={tone === 'success' ? 'text-success-foreground' : undefined}>{children}</div>
    </section>
  );
}

export function TodayCard({ state }: { state: TodayState }) {
  const router = useRouter();
  const [isStarting, startTransition] = useTransition();

  if (state.kind === 'no-program') {
    return (
      <EmptyState
        icon={Dumbbell}
        title="Your coach is preparing your program"
        description="Your training appears here as soon as your coach sets it up."
      />
    );
  }

  if (state.kind === 'rest-day') {
    return (
      <section className="space-y-2 rounded-xl border border-dashed bg-card p-4">
        <div className="flex items-center gap-2 text-muted-foreground">
          <CalendarDays className="size-5" aria-hidden />
          <p className="font-medium text-foreground">Rest day</p>
        </div>
        <p className="text-sm text-muted-foreground">
          {state.next ? (
            <>
              Next: {state.next.title} on <RelativeDate date={state.next.date} absolute />
            </>
          ) : (
            'No more workouts scheduled in this program.'
          )}
        </p>
      </section>
    );
  }

  if (state.kind === 'completed') {
    return (
      <>
        <WorkoutCardShell workout={state.workout}>
          <div className="space-y-3">
            <div className="flex items-center gap-2 text-success">
              <CheckCircle2 className="size-5" aria-hidden />
              <p className="font-medium">Completed today</p>
            </div>
            <p className="text-sm text-muted-foreground">
              <span className="num text-foreground">{state.setsDone}</span> sets logged
              {state.sessionRpe != null && (
                <>
                  {' · '}session RPE <span className="num text-foreground">{state.sessionRpe}</span>
                </>
              )}
            </p>
            <Button asChild variant="outline" size="lg" className="w-full">
              <Link href={`/client/workout/${state.logId}`}>View summary</Link>
            </Button>
          </div>
        </WorkoutCardShell>
        <Toaster />
      </>
    );
  }

  if (state.kind === 'in-progress') {
    return (
      <WorkoutCardShell workout={state.workout}>
        <div className="space-y-3">
          <p className="text-sm text-muted-foreground">
            <span className="num text-foreground">{state.setsDone}</span> sets done so far
          </p>
          <Button asChild size="lg" className="w-full">
            <Link href={`/client/workout/${state.logId}`}>
              <CalendarCheck aria-hidden />
              Resume workout
            </Link>
          </Button>
        </div>
      </WorkoutCardShell>
    );
  }

  // scheduled
  function start() {
    const workout = state as Extract<TodayState, { kind: 'scheduled' }>;
    startTransition(async () => {
      const res = await startWorkoutAction({
        programWorkoutId: workout.workout.programWorkoutId,
        clientGeneratedId: crypto.randomUUID(),
      });
      if ('error' in res) {
        toast.error(res.error);
        return;
      }
      router.push(`/client/workout/${res.logId}`);
    });
  }

  return (
    <>
      <WorkoutCardShell workout={state.workout}>
        <Button size="lg" className="w-full" onClick={start} disabled={isStarting}>
          {isStarting ? 'Starting…' : 'Start workout'}
        </Button>
      </WorkoutCardShell>
      <Toaster />
    </>
  );
}
