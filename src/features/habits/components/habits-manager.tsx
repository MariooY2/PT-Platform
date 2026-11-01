'use client';

import { useState, useTransition } from 'react';
import { ListChecks, MoreHorizontal, Plus } from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { EmptyState } from '@/components/shared/states';
import { habitTargetParts } from '../lib';
import type { TrainerHabit } from '../queries';
import { setHabitActiveAction } from '../actions';
import { HabitDialog } from './habit-dialog';

function HabitMeasure({ habit }: { habit: TrainerHabit }) {
  const parts = habitTargetParts(habit.target, habit.unit);
  if (!parts) return null;
  return (
    <span className="text-sm text-muted-foreground">
      {parts.value && <span className="num text-foreground">{parts.value}</span>}
      {parts.unit && <span className={cn(parts.value && 'ml-1')}>{parts.unit}</span>}
    </span>
  );
}

/**
 * The coach's habit manager on the client profile: add, edit and deactivate/reactivate habits.
 * Deactivating is reversible, so it happens immediately with an Undo toast (docs/ui/patterns.md).
 */
export function HabitsManager({ clientId, habits }: { clientId: string; habits: TrainerHabit[] }) {
  const [addOpen, setAddOpen] = useState(false);
  const [editing, setEditing] = useState<TrainerHabit | null>(null);
  const [, start] = useTransition();

  const active = habits.filter((h) => h.active);
  const inactive = habits.filter((h) => !h.active);

  function setActive(habit: TrainerHabit, next: boolean) {
    start(async () => {
      const res = await setHabitActiveAction(habit.id, next);
      if ('error' in res) {
        toast.error(res.error);
        return;
      }
      if (next) {
        toast.success('Habit reactivated.');
      } else {
        toast.success('Habit deactivated.', {
          action: {
            label: 'Undo',
            onClick: () => start(async () => void (await setHabitActiveAction(habit.id, true))),
          },
        });
      }
    });
  }

  return (
    <section aria-labelledby="habits-manager-heading" className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        <h2 id="habits-manager-heading" className="text-base font-semibold">
          Habits
        </h2>
        <Button onClick={() => setAddOpen(true)}>
          <Plus aria-hidden />
          Add habit
        </Button>
      </div>

      {habits.length === 0 ? (
        <EmptyState
          icon={ListChecks}
          title="No habits yet"
          description="Habits you set appear on the client’s Today screen to tick off each day."
          action={
            <Button onClick={() => setAddOpen(true)}>
              <Plus aria-hidden />
              Add habit
            </Button>
          }
        />
      ) : (
        <ul className="space-y-2">
          {active.map((habit) => (
            <li
              key={habit.id}
              className="flex min-h-11 items-center gap-3 rounded-md border bg-card px-3 py-2"
            >
              <span className="min-w-0 flex-1 truncate font-medium">{habit.name}</span>
              <HabitMeasure habit={habit} />
              <HabitRowMenu
                name={habit.name}
                onEdit={() => setEditing(habit)}
                onDeactivate={() => setActive(habit, false)}
              />
            </li>
          ))}
        </ul>
      )}

      {inactive.length > 0 && (
        <div className="space-y-2">
          <h3 className="text-sm font-medium text-muted-foreground">Inactive</h3>
          <ul className="space-y-2">
            {inactive.map((habit) => (
              <li
                key={habit.id}
                className="flex min-h-11 items-center gap-3 rounded-md border border-dashed px-3 py-2 text-muted-foreground"
              >
                <span className="min-w-0 flex-1 truncate">{habit.name}</span>
                <Button variant="outline" size="sm" onClick={() => setActive(habit, true)}>
                  Reactivate
                </Button>
              </li>
            ))}
          </ul>
        </div>
      )}

      <HabitDialog
        key={addOpen ? 'add-open' : 'add-closed'}
        open={addOpen}
        onOpenChange={setAddOpen}
        clientId={clientId}
      />
      <HabitDialog
        key={editing?.id ?? 'edit'}
        open={editing !== null}
        onOpenChange={(next) => !next && setEditing(null)}
        clientId={clientId}
        habit={editing ?? undefined}
      />
    </section>
  );
}

function HabitRowMenu({
  name,
  onEdit,
  onDeactivate,
}: {
  name: string;
  onEdit: () => void;
  onDeactivate: () => void;
}) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" aria-label={`Actions for ${name}`}>
          <MoreHorizontal />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem onSelect={onEdit}>Edit habit</DropdownMenuItem>
        <DropdownMenuItem variant="destructive" onSelect={onDeactivate}>
          Deactivate habit
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
