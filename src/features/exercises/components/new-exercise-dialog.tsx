'use client';

import { useId, useState, useTransition } from 'react';
import { Plus } from 'lucide-react';
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
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { createExerciseAction } from '../actions';
import { EQUIPMENT, EXERCISE_CATEGORIES, MUSCLES, humanizeTaxonomy } from '../taxonomy';

export function NewExerciseDialog() {
  const [open, setOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const errorId = useId();

  function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    startTransition(async () => {
      const result = await createExerciseAction(undefined, formData);
      if (result?.ok) {
        toast.success(`Added ${result.name}.`);
        setError(null);
        setOpen(false);
      } else {
        setError(result?.error ?? 'Check the form and try again.');
      }
    });
  }

  function onOpenChange(next: boolean) {
    setOpen(next);
    if (!next) setError(null);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogTrigger asChild>
        <Button>
          <Plus aria-hidden />
          New exercise
        </Button>
      </DialogTrigger>
      <DialogContent className="max-h-[90dvh] gap-0 overflow-y-auto sm:max-w-md">
        <DialogHeader>
          <DialogTitle>New exercise</DialogTitle>
          <DialogDescription>
            Add a custom exercise to your library. It stays private to you.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={onSubmit} className="mt-4 space-y-4" noValidate>
          <div className="grid gap-2">
            <Label htmlFor="ex-name">Name</Label>
            <Input id="ex-name" name="name" required placeholder="Paused front squat" />
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="grid gap-2">
              <Label htmlFor="ex-primary">Primary muscle</Label>
              <Select name="primaryMuscle" defaultValue="chest">
                <SelectTrigger id="ex-primary" className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {MUSCLES.map((m) => (
                    <SelectItem key={m} value={m}>
                      {humanizeTaxonomy(m)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid gap-2">
              <Label htmlFor="ex-category">Category</Label>
              <Select name="category" defaultValue="strength">
                <SelectTrigger id="ex-category" className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {EXERCISE_CATEGORIES.map((c) => (
                    <SelectItem key={c} value={c}>
                      {humanizeTaxonomy(c)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid gap-2">
            <Label htmlFor="ex-equipment">Equipment (optional)</Label>
            <Select name="equipment" defaultValue="none">
              <SelectTrigger id="ex-equipment" className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">No equipment</SelectItem>
                {EQUIPMENT.map((e) => (
                  <SelectItem key={e} value={e}>
                    {humanizeTaxonomy(e)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <fieldset className="grid gap-2">
            <legend className="mb-2 text-sm font-medium">Secondary muscles (optional)</legend>
            <div className="flex flex-wrap gap-x-4 gap-y-2">
              {MUSCLES.map((m) => (
                <Label
                  key={m}
                  htmlFor={`ex-sec-${m}`}
                  className="group/field-label text-sm font-normal"
                >
                  <Checkbox id={`ex-sec-${m}`} name="secondaryMuscles" value={m} />
                  {humanizeTaxonomy(m)}
                </Label>
              ))}
            </div>
          </fieldset>

          <div className="grid gap-2">
            <Label htmlFor="ex-video">Video link (optional)</Label>
            <Input
              id="ex-video"
              name="videoUrl"
              type="url"
              inputMode="url"
              placeholder="https://youtube.com/watch?v=…"
            />
          </div>

          <div className="grid gap-2">
            <Label htmlFor="ex-instructions">Instructions (optional)</Label>
            <Textarea
              id="ex-instructions"
              name="instructions"
              rows={3}
              placeholder="Cues, setup, tempo…"
            />
          </div>

          {error && (
            <p id={errorId} role="alert" className="text-sm text-destructive">
              {error}
            </p>
          )}

          <DialogFooter showCloseButton>
            <Button type="submit" disabled={pending}>
              {pending ? 'Saving…' : 'Add exercise'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
