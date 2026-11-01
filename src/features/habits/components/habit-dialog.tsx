'use client';

import { useId, useState, useTransition } from 'react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { createHabitAction, updateHabitAction } from '../actions';
import type { TrainerHabit } from '../queries';

/**
 * Add or edit a habit. One form for both: `habit` present means edit. Controlled by the manager so it
 * can be opened from a row's "…" menu. client_id/trainer_id are never in this form — the action takes
 * them from the session.
 */
export function HabitDialog({
  open,
  onOpenChange,
  clientId,
  habit,
}: {
  open: boolean;
  onOpenChange: (next: boolean) => void;
  clientId: string;
  habit?: TrainerHabit;
}) {
  const isEdit = Boolean(habit);
  const uid = useId();
  const fid = (f: string) => `${uid}-${f}`;
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();

  function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    const form = new FormData(event.currentTarget);
    const input = {
      name: String(form.get('name') ?? ''),
      target: String(form.get('target') ?? ''),
      unit: String(form.get('unit') ?? ''),
    };
    start(async () => {
      const res = habit
        ? await updateHabitAction(habit.id, input)
        : await createHabitAction(clientId, input);
      if ('error' in res) {
        setError(res.error);
        return;
      }
      toast.success(isEdit ? 'Habit updated.' : 'Habit added.');
      onOpenChange(false);
    });
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{isEdit ? 'Edit habit' : 'Add habit'}</DialogTitle>
          <DialogDescription>
            Habits appear on the client&rsquo;s Today screen to tick off each day.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={onSubmit} className="mt-2 space-y-4" noValidate>
          <div className="grid gap-2">
            <Label htmlFor={fid('name')}>Name</Label>
            <Input
              id={fid('name')}
              name="name"
              required
              defaultValue={habit?.name ?? ''}
              placeholder="Walk 8,000 steps"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="grid gap-2">
              <Label htmlFor={fid('target')}>Target (optional)</Label>
              <Input
                id={fid('target')}
                name="target"
                inputMode="decimal"
                defaultValue={habit?.target != null ? String(habit.target) : ''}
                placeholder="8000"
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor={fid('unit')}>Unit (optional)</Label>
              <Input
                id={fid('unit')}
                name="unit"
                defaultValue={habit?.unit ?? ''}
                placeholder="steps"
              />
            </div>
          </div>

          {error && (
            <p
              role="alert"
              className="text-sm text-destructive dark:text-destructive-soft-foreground"
            >
              {error}
            </p>
          )}

          <DialogFooter showCloseButton>
            <Button type="submit" disabled={pending}>
              {pending ? 'Saving…' : 'Save habit'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
