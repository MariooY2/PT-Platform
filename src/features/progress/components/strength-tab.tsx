'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { ChevronDown, Dumbbell } from 'lucide-react';
import { EmptyState, ErrorState } from '@/components/shared/states';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Weight, RelativeDate } from '@/components/format';
import { formatWeightValue } from '@/lib/format';
import { cn } from '@/lib/utils';
import { LineChart } from './line-chart';
import type { PrEntry, StrengthLift } from '../types';

const PR_LABEL: Record<PrEntry['type'], string> = {
  e1rm: 'Estimated 1RM',
  max_weight: 'Heaviest set',
  max_reps: 'Most reps',
};

/** Skeleton shaped like the lift rows: name/change on the left, e1RM on the right. */
function StrengthSkeleton() {
  return (
    <div className="space-y-2" aria-hidden>
      {Array.from({ length: 3 }).map((_, i) => (
        <div key={i} className="flex items-center justify-between gap-3 rounded-xl border p-4">
          <div className="space-y-2">
            <Skeleton className="h-4 w-28" />
            <Skeleton className="h-3 w-20" />
          </div>
          <Skeleton className="h-6 w-16" />
        </div>
      ))}
    </div>
  );
}

const kg = (v: number) => `${formatWeightValue(v).value} kg`;

function changeLabel(delta: number | null): string {
  if (delta == null) return 'First session logged';
  const rounded = Math.round(delta * 10) / 10;
  if (rounded === 0) return 'No change in 6 weeks';
  const sign = rounded > 0 ? '+' : '−';
  return `${sign}${kg(Math.abs(rounded))} in 6 weeks`;
}

function LiftRow({ lift }: { lift: StrengthLift }) {
  const [open, setOpen] = useState(false);
  const panelId = `lift-${lift.exerciseId}`;
  const summary = `${lift.name} e1RM ${
    lift.deltaE1rm == null
      ? 'from one session'
      : `${lift.deltaE1rm >= 0 ? 'up' : 'down'} ${kg(Math.abs(lift.deltaE1rm))} in 6 weeks`
  }`;

  return (
    <li className="rounded-xl border">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        aria-controls={panelId}
        className="flex min-h-11 w-full items-center gap-3 p-4 text-left outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
      >
        <div className="min-w-0 flex-1">
          <p className="truncate font-medium">{lift.name}</p>
          <p className="text-xs text-muted-foreground">{changeLabel(lift.deltaE1rm)}</p>
        </div>
        <div className="shrink-0 text-right">
          <Weight kg={lift.latestE1rm} className="num-lg" />
          <p className="text-xs text-muted-foreground">est. 1RM</p>
        </div>
        <ChevronDown
          className={cn(
            'size-4 shrink-0 text-muted-foreground transition-transform',
            open && 'rotate-180',
          )}
          aria-hidden
        />
      </button>

      {open && (
        <div id={panelId} className="space-y-4 border-t p-4">
          {lift.series.length >= 2 ? (
            <LineChart line={lift.series} summary={summary} formatValue={kg} />
          ) : (
            <p className="text-sm text-muted-foreground">
              One session logged so far. Log more to see the trend.
            </p>
          )}

          <div className="space-y-2">
            <h3 className="text-sm font-medium">Personal records</h3>
            {lift.prs.length === 0 ? (
              <p className="text-sm text-muted-foreground">No records yet.</p>
            ) : (
              <ul className="space-y-1.5">
                {lift.prs.map((pr) => (
                  <li key={pr.type} className="flex items-center justify-between gap-3 text-sm">
                    <span className="text-muted-foreground">{PR_LABEL[pr.type]}</span>
                    <span className="flex items-center gap-2">
                      <span className="num font-medium">
                        {pr.type === 'max_reps' ? `${Math.round(pr.value)} reps` : kg(pr.value)}
                      </span>
                      <RelativeDate
                        date={`${pr.achievedAt}`}
                        absolute
                        className="text-xs text-muted-foreground"
                      />
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      )}
    </li>
  );
}

export function StrengthTab({
  lifts,
  hadError = false,
  forcedState,
}: {
  lifts: StrengthLift[];
  hadError?: boolean;
  forcedState?: string;
}) {
  const router = useRouter();
  if (forcedState === 'loading') return <StrengthSkeleton />;
  if (forcedState === 'error' || hadError)
    return (
      <ErrorState
        title="Couldn’t load your strength"
        description="Check your connection and try again."
        onRetry={() => router.refresh()}
      />
    );
  if (forcedState === 'empty' || lifts.length === 0)
    return (
      <EmptyState
        icon={Dumbbell}
        title="No strength data yet"
        description="Log a few weighted sets in a workout and your main lifts show up here."
        action={
          <Button asChild variant="outline">
            <Link href="/client">Go to Today</Link>
          </Button>
        }
      />
    );

  return (
    <ul className="space-y-2">
      {lifts.map((lift) => (
        <LiftRow key={lift.exerciseId} lift={lift} />
      ))}
    </ul>
  );
}
