'use client';

import { useId, useState, useTransition } from 'react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { setTrainerDefaultCheckinWeekdayAction } from '../actions';
import { WEEKDAY_LABELS } from '../schemas';

export function TrainerCheckinDefaultForm({ currentWeekday }: { currentWeekday: number | null }) {
  const selectId = useId();
  const [weekday, setWeekday] = useState<string>(
    currentWeekday === null ? '' : String(currentWeekday),
  );
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [pending, start] = useTransition();

  function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSaved(false);
    if (weekday === '') {
      setError('Pick a day of the week.');
      return;
    }
    start(async () => {
      const res = await setTrainerDefaultCheckinWeekdayAction(Number(weekday));
      if (!res.ok) {
        setError(res.error);
        return;
      }
      setSaved(true);
      toast.success('Default day saved');
    });
  }

  return (
    <form onSubmit={onSubmit} className="max-w-sm space-y-4">
      <div className="grid gap-2">
        <Label htmlFor={selectId}>Default check-in day</Label>
        <select
          id={selectId}
          name="weekday"
          value={weekday}
          onChange={(e) => setWeekday(e.target.value)}
          className="h-11 w-full min-w-0 rounded-md border border-input bg-transparent px-3 py-1 text-base transition-colors outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50"
        >
          <option value="" disabled>
            Pick a day
          </option>
          {WEEKDAY_LABELS.map((label, value) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </select>
        <p className="text-xs text-muted-foreground">
          A new client’s Check-in tab starts on this day; confirm or change it on their profile.
        </p>
      </div>

      {error && (
        <p className="text-sm text-destructive dark:text-destructive-soft-foreground" role="alert">
          {error}
        </p>
      )}

      <div className="flex items-center gap-3">
        <Button type="submit" disabled={pending}>
          {pending ? 'Saving…' : 'Save default day'}
        </Button>
        {saved && !pending && (
          <span className="text-sm text-success-soft-foreground" aria-live="polite">
            Saved
          </span>
        )}
      </div>
    </form>
  );
}
