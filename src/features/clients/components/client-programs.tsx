import Link from 'next/link';
import { parseISO } from 'date-fns';
import { Dumbbell } from 'lucide-react';
import { EmptyState } from '@/components/shared/states';
import { StatusChip } from '@/components/shared/status-chip';
import { RelativeDate } from '@/components/format';
import { Button } from '@/components/ui/button';
import type { ClientProgramItem } from '@/features/programs/types';

/** The client's assigned program copies. Assigning happens from a template (Programs or the builder). */
export function ClientPrograms({ items }: { items: ClientProgramItem[] }) {
  if (items.length === 0) {
    return (
      <EmptyState
        icon={Dumbbell}
        title="No program assigned yet"
        description="Assign a template from Programs to give this client their first program."
        action={
          <Button asChild variant="outline">
            <Link href="/coach/programs">Go to programs</Link>
          </Button>
        }
      />
    );
  }
  return (
    <ul className="space-y-2">
      {items.map((p) => (
        <li key={p.id}>
          <Link
            href={`/coach/programs/${p.id}`}
            className="flex flex-col gap-2 rounded-xl border bg-card p-4 transition-colors hover:bg-accent focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
          >
            <div className="flex items-start justify-between gap-2">
              <span className="font-medium">{p.title}</span>
              <StatusChip tone={p.status === 'published' ? 'success' : 'neutral'}>
                {p.status === 'published' ? 'Published' : 'Draft'}
              </StatusChip>
            </div>
            <span className="text-sm text-muted-foreground">
              <span className="num">{p.weeks}</span> {p.weeks === 1 ? 'week' : 'weeks'} ·{' '}
              <span className="num">{p.workoutCount}</span>{' '}
              {p.workoutCount === 1 ? 'workout' : 'workouts'}
            </span>
            {p.startDate && (
              <span className="text-xs text-muted-foreground">
                Starts <RelativeDate date={parseISO(p.startDate)} absolute />
              </span>
            )}
          </Link>
        </li>
      ))}
    </ul>
  );
}
