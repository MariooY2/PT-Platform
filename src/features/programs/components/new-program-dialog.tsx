'use client';

import { useId, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { createProgramAction } from '../actions';

export function NewProgramDialog() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();
  const fid = useId();

  function onSubmit(formData: FormData) {
    setError(null);
    start(async () => {
      const res = await createProgramAction(formData);
      if ('error' in res) {
        setError(res.error);
        return;
      }
      setOpen(false);
      if (res.id) router.push(`/coach/programs/${res.id}`);
    });
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button type="button">
          <Plus aria-hidden />
          New program
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>New program</DialogTitle>
          <DialogDescription>
            Start a blank template. You can add weeks and workouts next.
          </DialogDescription>
        </DialogHeader>
        <form action={onSubmit} className="space-y-4">
          <div className="grid gap-2">
            <Label htmlFor={`${fid}-title`}>Name</Label>
            <Input id={`${fid}-title`} name="title" placeholder="12-Week Strength" autoFocus />
          </div>
          <div className="grid gap-2">
            <Label htmlFor={`${fid}-weeks`}>Weeks</Label>
            <Input
              id={`${fid}-weeks`}
              name="weeks"
              type="number"
              inputMode="numeric"
              defaultValue={4}
              min={1}
              max={52}
            />
          </div>
          {error && (
            <p
              className="text-sm text-destructive dark:text-destructive-soft-foreground"
              role="alert"
            >
              {error}
            </p>
          )}
          <DialogFooter>
            <Button type="submit" disabled={pending}>
              {pending ? 'Creating…' : 'Create program'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
