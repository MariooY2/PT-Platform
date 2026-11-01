'use client';

import { useState, useTransition } from 'react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { saveClientDetailsAction } from '../actions';

export function DetailsForm({
  clientId,
  goals,
  injuries,
  tags,
}: {
  clientId: string;
  goals: string | null;
  injuries: string | null;
  tags: string[];
}) {
  const [goalsValue, setGoalsValue] = useState(goals ?? '');
  const [injuriesValue, setInjuriesValue] = useState(injuries ?? '');
  const [tagsValue, setTagsValue] = useState(tags.join(', '));
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [pending, start] = useTransition();

  function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSaved(false);
    start(async () => {
      const res = await saveClientDetailsAction(clientId, {
        goals: goalsValue,
        injuries: injuriesValue,
        tags: tagsValue,
      });
      if ('error' in res) {
        setError(res.error);
        return;
      }
      setSaved(true);
      toast.success('Details saved');
    });
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <div className="grid gap-2">
        <Label htmlFor="goals">Goals</Label>
        <Textarea
          id="goals"
          name="goals"
          rows={3}
          value={goalsValue}
          onChange={(e) => setGoalsValue(e.target.value)}
          placeholder="What is this client working towards?"
        />
      </div>
      <div className="grid gap-2">
        <Label htmlFor="injuries">Injuries and limitations</Label>
        <Textarea
          id="injuries"
          name="injuries"
          rows={3}
          value={injuriesValue}
          onChange={(e) => setInjuriesValue(e.target.value)}
          placeholder="Anything to train around?"
        />
      </div>
      <div className="grid gap-2">
        <Label htmlFor="tags">Tags</Label>
        <Input
          id="tags"
          name="tags"
          value={tagsValue}
          onChange={(e) => setTagsValue(e.target.value)}
          placeholder="strength, online, rehab"
        />
        <p className="text-xs text-muted-foreground">Separate tags with commas.</p>
      </div>

      {error && (
        <p className="text-sm text-destructive dark:text-destructive-soft-foreground" role="alert">
          {error}
        </p>
      )}

      <div className="flex items-center gap-3">
        <Button type="submit" disabled={pending}>
          {pending ? 'Saving…' : 'Save details'}
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
