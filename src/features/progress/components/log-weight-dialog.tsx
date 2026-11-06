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
  DialogTrigger,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { logBodyMetricAction } from '../actions';
import type { LogBodyMetricInput } from '../schemas';

function numberOrUndefined(v: FormDataEntryValue | null): number | undefined {
  const s = String(v ?? '').trim();
  if (!s) return undefined;
  const n = Number(s);
  return Number.isNaN(n) ? undefined : n;
}

/**
 * Log a body-weight / measurement entry. client_id and trainer_id are never in this form — the action
 * takes them from the session. Weight uses a decimal keypad; every field is optional but the action
 * requires at least one value.
 */
export function LogWeightDialog() {
  const uid = useId();
  const fid = (f: string) => `${uid}-${f}`;
  const [open, setOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();

  function handleOpenChange(next: boolean) {
    if (!next) setError(null);
    setOpen(next);
  }

  function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    const form = new FormData(event.currentTarget);
    const input: LogBodyMetricInput = {
      measuredOn: String(form.get('measuredOn') ?? '').trim() || undefined,
      weightKg: numberOrUndefined(form.get('weightKg')),
      bodyFatPct: numberOrUndefined(form.get('bodyFatPct')),
      waistCm: numberOrUndefined(form.get('waistCm')),
      hipsCm: numberOrUndefined(form.get('hipsCm')),
    };
    start(async () => {
      const res = await logBodyMetricAction(input);
      if ('error' in res) {
        setError(res.error);
        return;
      }
      toast.success('Weight logged.');
      handleOpenChange(false);
    });
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        <Button>Log weight</Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Log weight</DialogTitle>
          <DialogDescription>
            Add today&rsquo;s weight, and any measurements you want to track.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={onSubmit} className="mt-2 space-y-4" noValidate>
          <div className="grid gap-2">
            <Label htmlFor={fid('weightKg')}>Weight (kg)</Label>
            <Input
              id={fid('weightKg')}
              name="weightKg"
              inputMode="decimal"
              autoComplete="off"
              placeholder="70.5"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="grid gap-2">
              <Label htmlFor={fid('waistCm')}>Waist (cm, optional)</Label>
              <Input id={fid('waistCm')} name="waistCm" inputMode="decimal" placeholder="80" />
            </div>
            <div className="grid gap-2">
              <Label htmlFor={fid('hipsCm')}>Hips (cm, optional)</Label>
              <Input id={fid('hipsCm')} name="hipsCm" inputMode="decimal" placeholder="95" />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="grid gap-2">
              <Label htmlFor={fid('bodyFatPct')}>Body fat (%, optional)</Label>
              <Input
                id={fid('bodyFatPct')}
                name="bodyFatPct"
                inputMode="decimal"
                placeholder="18"
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor={fid('measuredOn')}>Date (optional)</Label>
              <Input id={fid('measuredOn')} name="measuredOn" type="date" />
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
              {pending ? 'Saving…' : 'Log weight'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
