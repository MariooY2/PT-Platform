'use client';

import { useState, useTransition } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Check, Plus, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { StatusChip } from '@/components/shared/status-chip';
import { Toaster } from '@/components/ui/sonner';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { humanizeTaxonomy } from '@/features/exercises/taxonomy';
import {
  addExerciseAction,
  addWorkoutAction,
  applyQuickEntryAction,
  deleteExerciseAction,
  deleteWorkoutAction,
  setProgramStatusAction,
  setSupersetAction,
  updateWorkoutAction,
  type ActionResult,
} from '../actions';
import type { LoadedProgram } from '../queries';

type WorkoutExercise = LoadedProgram['program_workouts'][number]['workout_exercises'][number];
const DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

function setSummary(wex: WorkoutExercise): string {
  const s = wex.prescribed_sets.slice().sort((a, b) => a.set_number - b.set_number)[0];
  if (!s) return 'No sets yet';
  const count = wex.prescribed_sets.length;
  if (s.duration_sec) return `${count} × ${s.duration_sec}s`;
  const reps =
    s.reps_max && s.reps_max !== s.reps_min ? `${s.reps_min}–${s.reps_max}` : `${s.reps_min}`;
  const load = s.weight_kg ? ` · ${s.weight_kg}kg` : s.percent_1rm ? ` · ${s.percent_1rm}%` : '';
  const rpe = s.rpe ? ` · RPE ${s.rpe}` : '';
  return `${count} × ${reps}${load}${rpe}`;
}

export function ProgramBuilder({
  program,
  exercises,
}: {
  program: LoadedProgram;
  exercises: Array<{ id: string; name: string; primary_muscle: string }>;
}) {
  const router = useRouter();
  const [week, setWeek] = useState(1);
  const [openWorkout, setOpenWorkout] = useState<string | null>(null);
  const [pending, start] = useTransition();

  function run(fn: () => Promise<ActionResult>, ok?: string) {
    start(async () => {
      const res = await fn();
      if ('error' in res) {
        toast.error(res.error);
        return;
      }
      if (ok) toast.success(ok);
      router.refresh();
    });
  }

  const workouts = program.program_workouts.filter((w) => w.week === week);
  const editing = program.program_workouts.find((w) => w.id === openWorkout) ?? null;

  return (
    <div className="space-y-6 p-4 sm:p-6 lg:p-8">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="space-y-1">
          <Link
            href="/coach/programs"
            className="inline-flex items-center gap-1 rounded-md text-sm text-muted-foreground hover:text-foreground focus-visible:ring-3 focus-visible:ring-ring/50"
          >
            <ArrowLeft className="size-4" aria-hidden /> Programs
          </Link>
          <h1 className="text-2xl font-bold">{program.title}</h1>
          <p className="flex items-center gap-2 text-sm text-muted-foreground">
            <StatusChip tone={program.is_template ? 'info' : 'neutral'}>
              {program.is_template ? 'Template' : 'Client copy'}
            </StatusChip>
            {pending ? (
              'Saving…'
            ) : (
              <span className="inline-flex items-center gap-1">
                <Check className="size-3.5" aria-hidden /> Saved
              </span>
            )}
          </p>
          {!program.is_template && (
            <p className="text-sm text-muted-foreground">Changes apply to this client only.</p>
          )}
        </div>
        <Button
          type="button"
          variant={program.status === 'published' ? 'outline' : 'default'}
          disabled={pending}
          onClick={() =>
            run(
              () =>
                setProgramStatusAction(
                  program.id,
                  program.status === 'published' ? 'draft' : 'published',
                ),
              program.status === 'published' ? 'Unpublished' : 'Published',
            )
          }
        >
          {program.status === 'published' ? 'Unpublish' : 'Publish'}
        </Button>
      </div>

      {/* Week tabs */}
      <div className="flex flex-wrap gap-1" role="group" aria-label="Weeks">
        {Array.from({ length: program.weeks }, (_, i) => i + 1).map((w) => (
          <Button
            key={w}
            type="button"
            size="default"
            variant={w === week ? 'secondary' : 'ghost'}
            aria-pressed={w === week}
            onClick={() => setWeek(w)}
          >
            Week {w}
          </Button>
        ))}
      </div>

      {/* Day grid */}
      <div className="grid grid-cols-2 gap-2 lg:grid-cols-4 xl:grid-cols-7">
        {DAYS.map((label, idx) => {
          const day = idx + 1;
          const dayWorkouts = workouts.filter((w) => w.day === day);
          return (
            <div key={day} className="flex min-h-24 flex-col rounded-xl border bg-card p-2">
              <div className="flex items-center justify-between gap-1">
                <p className="px-1 text-xs font-medium text-muted-foreground">{label}</p>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  aria-label={`Add workout on ${label}`}
                  disabled={pending}
                  onClick={() => run(() => addWorkoutAction(program.id, week, day))}
                >
                  <Plus className="size-4" aria-hidden />
                </Button>
              </div>
              <ul className="mt-1 space-y-1">
                {dayWorkouts.map((w) => (
                  <li key={w.id}>
                    <button
                      type="button"
                      onClick={() => setOpenWorkout(w.id)}
                      className="w-full rounded-md border bg-background p-2 text-left text-sm hover:bg-accent focus-visible:ring-3 focus-visible:ring-ring/50"
                    >
                      <span className="block font-medium">{w.title ?? 'Workout'}</span>
                      <span className="text-xs text-muted-foreground">
                        {w.workout_exercises.length}{' '}
                        {w.workout_exercises.length === 1 ? 'exercise' : 'exercises'}
                      </span>
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          );
        })}
      </div>

      {editing && (
        <WorkoutEditor
          key={editing.id}
          programId={program.id}
          workout={editing}
          exercises={exercises}
          pending={pending}
          run={run}
          onClose={() => setOpenWorkout(null)}
        />
      )}
      <Toaster />
    </div>
  );
}

function WorkoutEditor({
  programId,
  workout,
  exercises,
  pending,
  run,
  onClose,
}: {
  programId: string;
  workout: LoadedProgram['program_workouts'][number];
  exercises: Array<{ id: string; name: string; primary_muscle: string }>;
  pending: boolean;
  run: (fn: () => Promise<ActionResult>, ok?: string) => void;
  onClose: () => void;
}) {
  const [title, setTitle] = useState(workout.title ?? '');
  const rows = workout.workout_exercises.slice().sort((a, b) => a.position - b.position);

  return (
    <section aria-label="Workout editor" className="space-y-4 rounded-xl border bg-card p-4">
      <div className="flex items-center justify-between gap-2">
        <div className="flex-1">
          <Label htmlFor="workout-title" className="sr-only">
            Workout title
          </Label>
          <Input
            id="workout-title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            onBlur={() =>
              title !== (workout.title ?? '') &&
              run(() => updateWorkoutAction(programId, workout.id, { title }))
            }
            placeholder="Workout name"
            className="max-w-xs font-medium"
          />
        </div>
        <Button
          type="button"
          variant="ghost"
          size="default"
          disabled={pending}
          onClick={() => {
            run(() => deleteWorkoutAction(programId, workout.id), 'Workout deleted');
            onClose();
          }}
        >
          <Trash2 className="size-4" aria-hidden /> Delete
        </Button>
      </div>

      <ul className="space-y-2">
        {rows.map((wex, i) => (
          <ExerciseRow
            key={wex.id}
            programId={programId}
            wex={wex}
            nextId={rows[i + 1]?.id ?? null}
            pending={pending}
            run={run}
          />
        ))}
      </ul>

      <AddExercise
        programId={programId}
        workoutId={workout.id}
        position={rows.length}
        exercises={exercises}
        pending={pending}
        run={run}
      />
    </section>
  );
}

function ExerciseRow({
  programId,
  wex,
  nextId,
  pending,
  run,
}: {
  programId: string;
  wex: WorkoutExercise;
  nextId: string | null;
  pending: boolean;
  run: (fn: () => Promise<ActionResult>, ok?: string) => void;
}) {
  const grouped = Boolean(wex.group_label);
  const [text, setText] = useState('');
  return (
    <li className="flex flex-wrap items-center gap-2 rounded-md border p-2">
      {wex.group_label && (
        <StatusChip tone="info" className="shrink-0">
          {wex.group_label}
        </StatusChip>
      )}
      <span className="min-w-0 flex-1">
        <span className="block truncate font-medium">{wex.exercises?.name ?? 'Exercise'}</span>
        <span className="text-xs text-muted-foreground">{setSummary(wex)}</span>
      </span>
      <Input
        value={text}
        onChange={(e) => setText(e.target.value)}
        placeholder="4x5 @80%"
        aria-label={`Prescription for ${wex.exercises?.name ?? 'exercise'}`}
        className="w-32"
        onKeyDown={(e) => {
          if (e.key === 'Enter' && text.trim()) {
            run(() => applyQuickEntryAction(programId, wex.id, text), 'Sets updated');
            setText('');
          }
        }}
      />
      <Button
        type="button"
        size="default"
        variant="outline"
        disabled={pending || !text.trim()}
        onClick={() => {
          run(() => applyQuickEntryAction(programId, wex.id, text), 'Sets updated');
          setText('');
        }}
      >
        Apply
      </Button>
      <Button
        type="button"
        size="default"
        variant="ghost"
        disabled={pending || (!grouped && !nextId)}
        title={!grouped && !nextId ? 'Add another exercise below to superset' : undefined}
        onClick={() => run(() => setSupersetAction(programId, wex.id, grouped ? null : nextId))}
      >
        {grouped ? 'Ungroup' : 'Superset'}
      </Button>
      <Button
        type="button"
        size="icon"
        variant="ghost"
        aria-label={`Remove ${wex.exercises?.name ?? 'exercise'}`}
        disabled={pending}
        onClick={() => run(() => deleteExerciseAction(programId, wex.id), 'Exercise removed')}
      >
        <Trash2 className="size-4" aria-hidden />
      </Button>
    </li>
  );
}

function AddExercise({
  programId,
  workoutId,
  position,
  exercises,
  pending,
  run,
}: {
  programId: string;
  workoutId: string;
  position: number;
  exercises: Array<{ id: string; name: string; primary_muscle: string }>;
  pending: boolean;
  run: (fn: () => Promise<ActionResult>, ok?: string) => void;
}) {
  const [value, setValue] = useState('');
  return (
    <div className="flex items-center gap-2">
      <Select
        value={value}
        onValueChange={(v) => {
          setValue('');
          run(() => addExerciseAction(programId, workoutId, v, position), 'Exercise added');
        }}
      >
        <SelectTrigger aria-label="Add exercise" className="max-w-xs" disabled={pending}>
          <SelectValue placeholder="+ Add exercise" />
        </SelectTrigger>
        <SelectContent>
          {exercises.map((e) => (
            <SelectItem key={e.id} value={e.id}>
              {e.name} · {humanizeTaxonomy(e.primary_muscle)}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
