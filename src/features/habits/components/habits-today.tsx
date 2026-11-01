'use client';

import { useOptimistic, useTransition } from 'react';
import { Check } from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { Toaster } from '@/components/ui/sonner';
import { habitTargetParts } from '../lib';
import type { ClientHabit } from '../queries';
import { setHabitTickAction } from '../actions';

/**
 * The client's active habits on Today. Tapping a row ticks it optimistically; the tick is persisted
 * by an idempotent UPSERT server action. Taps are never blocked (idempotent server side), and if the
 * server rejects, the optimistic state reverts when the transition ends and a toast says why.
 */
export function HabitsToday({ habits }: { habits: ClientHabit[] }) {
  const [view, setDone] = useOptimistic(habits, (state, patch: { id: string; done: boolean }) =>
    state.map((h) => (h.id === patch.id ? { ...h, done: patch.done } : h)),
  );
  const [, startTransition] = useTransition();

  function toggle(habit: ClientHabit) {
    const next = !habit.done;
    startTransition(async () => {
      setDone({ id: habit.id, done: next });
      const res = await setHabitTickAction(habit.id, next);
      if ('error' in res) toast.error(res.error);
    });
  }

  return (
    <section aria-labelledby="habits-heading" className="space-y-3">
      <h2 id="habits-heading" className="text-base font-semibold">
        Habits
      </h2>
      <ul className="space-y-2">
        {view.map((habit) => {
          const parts = habitTargetParts(habit.target, habit.unit);
          return (
            <li key={habit.id}>
              <button
                type="button"
                onClick={() => toggle(habit)}
                aria-pressed={habit.done}
                className={cn(
                  'flex min-h-11 w-full items-center gap-3 rounded-md border px-3 py-2 text-left transition-colors outline-none',
                  'focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50',
                  habit.done
                    ? 'border-success-soft-foreground/20 bg-success-soft text-success-soft-foreground'
                    : 'bg-card hover:bg-muted',
                )}
              >
                <span
                  aria-hidden
                  className={cn(
                    'flex size-6 shrink-0 items-center justify-center rounded-full border',
                    habit.done
                      ? 'border-transparent bg-success text-success-foreground'
                      : 'border-input',
                  )}
                >
                  {habit.done && <Check className="size-4" strokeWidth={3} />}
                </span>
                <span className="min-w-0 flex-1 truncate font-medium">{habit.name}</span>
                {parts && (
                  <span className="shrink-0 text-sm text-muted-foreground">
                    {parts.value && <span className="num text-foreground">{parts.value}</span>}
                    {parts.unit && <span className={cn(parts.value && 'ml-1')}>{parts.unit}</span>}
                  </span>
                )}
                <span className="sr-only">{habit.done ? 'Done today' : 'Not done today'}</span>
              </button>
            </li>
          );
        })}
      </ul>
      <Toaster />
    </section>
  );
}
