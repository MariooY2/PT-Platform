'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Check, ChevronLeft, ChevronRight, Info, Play } from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Toaster } from '@/components/ui/sonner';
import { youtubeEmbedUrl } from '@/features/exercises/media';
import { finishWorkoutAction, logSetAction } from '../actions';
import { prefillSet, restRemainingMs } from '../lib';
import type { PlayerExercise, WorkoutPlayerData } from '../types';
import { useSetLogOutbox } from '../offline/use-outbox';
import { RestTimerBar } from './rest-timer-bar';
import { SyncIndicator } from './sync-indicator';

interface SetDraft {
  setNumber: number;
  clientGeneratedId: string | null;
  weight: string;
  reps: string;
  rpe: string;
  completed: boolean;
  isPr: boolean;
  pending: boolean;
}

function toNum(s: string): number | null {
  if (s.trim() === '') return null;
  const n = Number(s);
  return Number.isFinite(n) ? n : null;
}

function mmss(ms: number): string {
  const total = Math.max(0, Math.floor(ms / 1000));
  const m = Math.floor(total / 60);
  const s = total % 60;
  return `${m}:${String(s).padStart(2, '0')}`;
}

function hasRpe(ex: PlayerExercise): boolean {
  return ex.prescribedSets.some((s) => s.rpe != null);
}

/** "3 × 8–10 · 80 kg · RPE 8 · rest 2:00" — the prescription in words. */
function prescriptionLine(ex: PlayerExercise): string {
  const sets = ex.prescribedSets;
  const first = sets[0];
  if (!first) return 'No sets prescribed';
  const reps =
    first.repsMax && first.repsMax !== first.repsMin
      ? `${first.repsMin}–${first.repsMax}`
      : `${first.repsMin ?? '—'}`;
  const parts = [`${sets.length} × ${reps}`];
  if (first.weightKg) parts.push(`${first.weightKg} kg`);
  if (first.rpe) parts.push(`RPE ${first.rpe}`);
  if (ex.restSeconds) parts.push(`rest ${mmss(ex.restSeconds * 1000)}`);
  return parts.join(' · ');
}

function buildDrafts(data: WorkoutPlayerData): Record<string, SetDraft[]> {
  const out: Record<string, SetDraft[]> = {};
  for (const ex of data.exercises) {
    out[ex.workoutExerciseId] = ex.prescribedSets.map((ps) => {
      const existing = data.existingSets.find(
        (s) => s.workoutExerciseId === ex.workoutExerciseId && s.setNumber === ps.setNumber,
      );
      const prev = ex.previous.find((p) => p.setNumber === ps.setNumber) ?? ex.previous[0] ?? null;
      const fill = prefillSet(
        { repsMin: ps.repsMin, repsMax: ps.repsMax, weightKg: ps.weightKg },
        prev ? { weightKg: prev.weightKg, reps: prev.reps } : null,
      );
      if (existing) {
        return {
          setNumber: ps.setNumber,
          clientGeneratedId: existing.clientGeneratedId,
          weight: existing.weightKg == null ? fill.weight : String(existing.weightKg),
          reps: existing.reps == null ? fill.reps : String(existing.reps),
          rpe: existing.rpe == null ? '' : String(existing.rpe),
          completed: existing.completed,
          isPr: ex.prClientGeneratedIds.includes(existing.clientGeneratedId),
          pending: false,
        };
      }
      return {
        setNumber: ps.setNumber,
        clientGeneratedId: null,
        weight: fill.weight,
        reps: fill.reps,
        rpe: ps.rpe == null ? '' : String(ps.rpe),
        completed: false,
        isPr: false,
        pending: false,
      };
    });
  }
  return out;
}

export function WorkoutPlayer({ data }: { data: WorkoutPlayerData }) {
  const router = useRouter();
  const startedAtMs = useMemo(() => new Date(data.startedAt).getTime(), [data.startedAt]);

  const [drafts, setDrafts] = useState<Record<string, SetDraft[]>>(() => buildDrafts(data));
  const [index, setIndex] = useState(0);
  const [now, setNow] = useState<number | null>(null);
  const [restEndsAt, setRestEndsAt] = useState<number | null>(null);
  const [view, setView] = useState<'logging' | 'summary'>('logging');
  const [sessionRpe, setSessionRpe] = useState<number | null>(data.sessionRpe);
  const [note, setNote] = useState('');
  const [finishing, setFinishing] = useState(false);
  const vibratedRef = useRef(false);

  // Set writes go through the IndexedDB outbox: enqueue, then flush when online. Offline writes are
  // held and synced on reconnect via the idempotent logSetAction (upsert on client_generated_id).
  const outbox = useSetLogOutbox(logSetAction);

  // One ticker drives both the elapsed clock and the rest countdown. `now` starts null so the server
  // and first client render match (no hydration mismatch); the effect starts the clock after mount.
  useEffect(() => {
    // Seed on the next frame (not synchronously in the effect body) and then tick.
    const raf = requestAnimationFrame(() => setNow(Date.now()));
    const id = setInterval(() => setNow(Date.now()), 250);
    const onVisible = () => setNow(Date.now());
    document.addEventListener('visibilitychange', onVisible);
    return () => {
      cancelAnimationFrame(raf);
      clearInterval(id);
      document.removeEventListener('visibilitychange', onVisible);
    };
  }, []);

  const restRemaining = restEndsAt == null || now == null ? 0 : restRemainingMs(restEndsAt, now);
  const restDone = restEndsAt != null && now != null && restRemaining <= 0;

  // Vibrate once when the rest reaches zero (guarded; best-effort, no sound).
  useEffect(() => {
    if (restDone && !vibratedRef.current) {
      vibratedRef.current = true;
      if (typeof navigator !== 'undefined' && typeof navigator.vibrate === 'function') {
        navigator.vibrate(200);
      }
    }
    if (!restDone) vibratedRef.current = false;
  }, [restDone]);

  const startRest = useCallback((restSeconds: number | null) => {
    if (!restSeconds || restSeconds <= 0) return;
    vibratedRef.current = false;
    setRestEndsAt(Date.now() + restSeconds * 1000);
  }, []);

  // Read-only summary when the session is already completed (opened via "View summary").
  if (data.status === 'completed') {
    return <CompletedView data={data} drafts={drafts} />;
  }

  const current = data.exercises[index];
  const total = data.exercises.length;

  function updateDraft(wexId: string, setNumber: number, patch: Partial<SetDraft>) {
    setDrafts((d) => ({
      ...d,
      [wexId]: (d[wexId] ?? []).map((s) => (s.setNumber === setNumber ? { ...s, ...patch } : s)),
    }));
  }

  async function toggleSet(ex: PlayerExercise, setNumber: number) {
    const rows = drafts[ex.workoutExerciseId] ?? [];
    const draft = rows.find((s) => s.setNumber === setNumber);
    if (!draft || draft.pending) return;
    const next = !draft.completed;
    const cgid = draft.clientGeneratedId ?? crypto.randomUUID();

    updateDraft(ex.workoutExerciseId, setNumber, {
      completed: next,
      clientGeneratedId: cgid,
      pending: true,
      isPr: next ? draft.isPr : false,
    });
    if (next) startRest(ex.restSeconds);

    // Enqueue + flush. Queued or failed writes stay saved locally and sync later — never revert here.
    const outcome = await outbox.submit({
      workoutLogId: data.logId,
      workoutExerciseId: ex.workoutExerciseId,
      setNumber,
      reps: toNum(draft.reps),
      weightKg: toNum(draft.weight),
      rpe: toNum(draft.rpe),
      completed: next,
      clientGeneratedId: cgid,
    });

    const isPr = next && outcome.kind === 'synced' && outcome.result.prTypes.length > 0;
    if (isPr && typeof navigator !== 'undefined' && typeof navigator.vibrate === 'function') {
      navigator.vibrate([0, 120, 60, 120]);
    }
    updateDraft(ex.workoutExerciseId, setNumber, { pending: false, isPr });
  }

  function addSet(ex: PlayerExercise) {
    setDrafts((d) => {
      const rows = d[ex.workoutExerciseId] ?? [];
      const last = rows[rows.length - 1];
      const nextNumber = (last?.setNumber ?? 0) + 1;
      return {
        ...d,
        [ex.workoutExerciseId]: [
          ...rows,
          {
            setNumber: nextNumber,
            clientGeneratedId: null,
            weight: last?.weight ?? '',
            reps: last?.reps ?? '',
            rpe: last?.rpe ?? '',
            completed: false,
            isPr: false,
            pending: false,
          },
        ],
      };
    });
  }

  function saveAndFinish() {
    setFinishing(true);
    void (async () => {
      const res = await finishWorkoutAction({ workoutLogId: data.logId, sessionRpe, note });
      if ('error' in res) {
        setFinishing(false);
        toast.error(res.error);
        return;
      }
      router.push('/client');
      router.refresh();
    })();
  }

  const allDrafts = Object.values(drafts).flat();
  const setsCompleted = allDrafts.filter((s) => s.completed).length;
  const setsUnlogged = allDrafts.length - setsCompleted;
  const totalVolume = allDrafts
    .filter((s) => s.completed)
    .reduce((sum, s) => sum + (toNum(s.weight) ?? 0) * (toNum(s.reps) ?? 0), 0);
  const prCount = allDrafts.filter((s) => s.isPr).length;

  const elapsed = now == null ? '0:00' : mmss(now - startedAtMs);
  const progressPct = Math.round(((index + 1) / total) * 100);

  if (view === 'summary') {
    return (
      <div className="mx-auto flex min-h-dvh w-full max-w-[560px] flex-col gap-6 p-4 sm:p-6">
        <header className="space-y-1">
          <h1 className="text-xl font-semibold">Strong session.</h1>
          <p className="text-sm text-muted-foreground">{data.title}</p>
        </header>

        <dl className="grid grid-cols-2 gap-3">
          <SummaryStat label="Duration" value={elapsed} edge="primary" />
          <SummaryStat label="Sets logged" value={String(setsCompleted)} edge="primary" />
          <SummaryStat
            label="Total volume"
            value={`${Math.round(totalVolume)} kg`}
            edge="success"
          />
          <SummaryStat
            label="Personal records"
            value={prCount === 0 ? 'None' : `${prCount} new`}
            tone={prCount > 0 ? 'pr' : 'default'}
          />
        </dl>

        {setsUnlogged > 0 && (
          <p className="rounded-md border border-warning-soft-foreground/20 bg-warning-soft px-3 py-2 text-sm text-warning-soft-foreground">
            {setsUnlogged} {setsUnlogged === 1 ? 'set isn’t' : 'sets aren’t'} logged. You can finish
            anyway.
          </p>
        )}

        <fieldset className="space-y-2">
          <legend className="text-sm font-medium">How hard was the session? (1–10)</legend>
          <div className="flex flex-wrap gap-2">
            {Array.from({ length: 10 }).map((_, n) => {
              const selected = sessionRpe === n + 1;
              return (
                <button
                  key={n}
                  type="button"
                  aria-pressed={selected}
                  onClick={() => setSessionRpe(n + 1)}
                  className={cn(
                    'size-12 rounded-md border text-base num',
                    selected
                      ? 'border-primary bg-primary text-primary-foreground'
                      : 'border-input hover:bg-muted',
                  )}
                >
                  {n + 1}
                </button>
              );
            })}
          </div>
        </fieldset>

        <div className="space-y-2">
          <label htmlFor="session-note" className="text-sm font-medium">
            Note to your coach (optional)
          </label>
          <Textarea
            id="session-note"
            value={note}
            onChange={(e) => setNote(e.target.value)}
            rows={3}
            placeholder="How did it feel?"
          />
        </div>

        <div className="mt-auto flex items-center justify-between gap-3">
          <Button
            variant="outline"
            size="lg"
            onClick={() => setView('logging')}
            disabled={finishing}
          >
            Back to sets
          </Button>
          <Button size="lg" onClick={saveAndFinish} disabled={finishing}>
            {finishing ? 'Saving…' : 'Save and finish'}
          </Button>
        </div>
        <Toaster />
      </div>
    );
  }

  if (!current) {
    // A scheduled workout with no exercises (e.g. the coach removed them mid-session) — fail to a
    // calm empty state, not a crash.
    return (
      <div className="mx-auto flex h-dvh w-full max-w-[560px] flex-col items-center justify-center gap-4 p-6 text-center">
        <p className="text-sm text-muted-foreground">This workout has no exercises yet.</p>
        <Button asChild variant="outline" size="lg">
          <Link href="/client">Back to Today</Link>
        </Button>
        <Toaster />
      </div>
    );
  }

  const embed = youtubeEmbedUrl(current.videoUrl);
  const rpeShown = hasRpe(current);
  const rows = drafts[current.workoutExerciseId] ?? [];

  return (
    <div className="mx-auto flex h-dvh w-full max-w-[560px] flex-col">
      <header className="flex shrink-0 items-center gap-3 border-b px-4 py-3">
        <Button asChild variant="ghost" size="icon-lg" aria-label="Back to Today">
          <Link href="/client">
            <ChevronLeft aria-hidden />
          </Link>
        </Button>
        <div className="min-w-0 flex-1">
          <p className="truncate font-semibold">{data.title}</p>
          <p className="text-xs num text-muted-foreground">{elapsed} elapsed</p>
          <SyncIndicator state={outbox.state} />
        </div>
        <Button size="lg" variant="outline" onClick={() => setView('summary')}>
          Finish
        </Button>
      </header>

      <div className="shrink-0 space-y-1 px-4 py-2">
        <div className="flex items-center justify-between text-xs text-muted-foreground">
          <span className="num">
            Exercise {index + 1} of {total}
          </span>
        </div>
        <div
          className="h-2 w-full overflow-hidden rounded-full bg-muted"
          role="progressbar"
          aria-valuenow={index + 1}
          aria-valuemin={1}
          aria-valuemax={total}
          aria-label={`Exercise ${index + 1} of ${total}`}
        >
          <div
            className="h-full rounded-full bg-primary transition-all"
            style={{ width: `${progressPct}%` }}
          />
        </div>
      </div>

      <div className="min-h-0 flex-1 space-y-4 overflow-y-auto px-4 pb-4">
        <div className="space-y-2">
          <div className="flex items-start justify-between gap-2">
            <h1 className="text-lg font-semibold">{current.name}</h1>
            {current.videoUrl &&
              (embed ? null : (
                <a
                  href={current.videoUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-1 text-sm text-primary underline-offset-4 hover:underline"
                >
                  <Play className="size-4" aria-hidden />
                  Watch video
                </a>
              ))}
          </div>
          <p className="text-sm num text-muted-foreground">{prescriptionLine(current)}</p>
          {current.coachNotes && (
            <p className="flex items-start gap-1.5 rounded-md bg-accent px-3 py-2 text-sm text-accent-foreground">
              <Info className="mt-0.5 size-4 shrink-0" aria-hidden />
              <span>{current.coachNotes}</span>
            </p>
          )}
        </div>

        {embed && (
          <div className="aspect-video w-full overflow-hidden rounded-xl border">
            <iframe
              src={embed}
              title={`${current.name} demo`}
              allow="accelerometer; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen
              className="size-full"
            />
          </div>
        )}

        <div className="space-y-2">
          <div
            className={cn(
              'grid items-center gap-2 px-1 text-xs text-muted-foreground',
              rpeShown ? 'grid-cols-[2rem_1fr_1fr_3rem_3rem]' : 'grid-cols-[2rem_1fr_1fr_3rem]',
            )}
          >
            <span>Set</span>
            <span>kg</span>
            <span>reps</span>
            {rpeShown && <span>RPE</span>}
            <span className="text-right">Done</span>
          </div>
          {rows.map((draft) => {
            const prev = current.previous.find((p) => p.setNumber === draft.setNumber);
            return (
              <SetRow
                key={draft.setNumber}
                draft={draft}
                rpeShown={rpeShown}
                previous={prev ?? null}
                onChange={(patch) => updateDraft(current.workoutExerciseId, draft.setNumber, patch)}
                onToggle={() => toggleSet(current, draft.setNumber)}
              />
            );
          })}
          <button
            type="button"
            onClick={() => addSet(current)}
            className="min-h-12 w-full rounded-md border border-dashed text-sm text-muted-foreground hover:bg-muted"
          >
            + Add set
          </button>
        </div>
      </div>

      {/* Bottom region: IN-FLOW flex items (never sticky), so nothing paints over the set list. */}
      {restEndsAt != null && (
        <div className="shrink-0 px-4 pb-2">
          <RestTimerBar
            remainingMs={restRemaining}
            done={restDone}
            onAdjust={(delta) => setRestEndsAt((e) => (e == null ? e : e + delta * 1000))}
            onSkip={() => setRestEndsAt(null)}
          />
        </div>
      )}
      <div className="flex shrink-0 items-center justify-between gap-3 border-t px-4 py-3">
        <Button
          variant="outline"
          size="lg"
          onClick={() => setIndex((i) => Math.max(0, i - 1))}
          disabled={index === 0}
        >
          <ChevronLeft aria-hidden />
          Previous
        </Button>
        <Button
          variant="outline"
          size="lg"
          onClick={() => setIndex((i) => Math.min(total - 1, i + 1))}
          disabled={index === total - 1}
        >
          Next
          <ChevronRight aria-hidden />
        </Button>
      </div>
      <Toaster />
    </div>
  );
}

function SetRow({
  draft,
  rpeShown,
  previous,
  onChange,
  onToggle,
}: {
  draft: SetDraft;
  rpeShown: boolean;
  previous: { weightKg: number | null; reps: number | null } | null;
  onChange: (patch: Partial<SetDraft>) => void;
  onToggle: () => void;
}) {
  return (
    <div
      className={cn(
        'grid items-center gap-2 rounded-md border px-1 py-1 transition-colors',
        rpeShown ? 'grid-cols-[2rem_1fr_1fr_3rem_3rem]' : 'grid-cols-[2rem_1fr_1fr_3rem]',
        draft.isPr
          ? 'border-pr bg-pr-soft text-pr-soft-foreground'
          : draft.completed
            ? 'border-success-soft-foreground/20 bg-success-soft'
            : 'bg-card',
      )}
    >
      <span className="pl-1 text-sm num">{draft.setNumber}</span>
      <div>
        <Input
          inputMode="decimal"
          aria-label={`Set ${draft.setNumber} weight in kilograms`}
          value={draft.weight}
          onFocus={(e) => e.currentTarget.select()}
          onChange={(e) => onChange({ weight: e.target.value })}
          className="h-12 px-2 text-center num-xl"
        />
        {previous && previous.weightKg != null && (
          <span className="block pt-0.5 text-center text-xs text-muted-foreground">
            Last time: {previous.weightKg} kg × {previous.reps ?? '—'}
          </span>
        )}
      </div>
      <div>
        <Input
          inputMode="numeric"
          aria-label={`Set ${draft.setNumber} reps`}
          value={draft.reps}
          onFocus={(e) => e.currentTarget.select()}
          onChange={(e) => onChange({ reps: e.target.value })}
          className="h-12 px-2 text-center num-xl"
        />
      </div>
      {rpeShown && (
        <Input
          inputMode="decimal"
          aria-label={`Set ${draft.setNumber} RPE`}
          value={draft.rpe}
          onFocus={(e) => e.currentTarget.select()}
          onChange={(e) => onChange({ rpe: e.target.value })}
          className="h-12 px-1 text-center num"
        />
      )}
      <div className="flex justify-end pr-1">
        <button
          type="button"
          onClick={onToggle}
          aria-pressed={draft.completed}
          aria-label={
            draft.completed ? `Set ${draft.setNumber} logged` : `Log set ${draft.setNumber}`
          }
          className={cn(
            'inline-flex size-12 items-center justify-center rounded-md border focus-visible:ring-3 focus-visible:ring-ring/50',
            draft.completed
              ? 'border-transparent bg-success text-success-foreground'
              : 'border-input hover:bg-muted',
          )}
        >
          <Check
            className={cn('size-6', !draft.completed && 'opacity-30')}
            strokeWidth={3}
            aria-hidden
          />
        </button>
      </div>
      {draft.isPr && (
        <span className="col-span-full px-1 pb-0.5 text-xs font-semibold text-pr-soft-foreground">
          New PR{draft.weight && draft.reps ? ` — ${draft.weight} kg × ${draft.reps}` : ''}
        </span>
      )}
    </div>
  );
}

const SUMMARY_EDGE: Record<string, string> = {
  primary: 'border-t-primary',
  success: 'border-t-success',
  warning: 'border-t-warning',
  destructive: 'border-t-destructive',
};

function SummaryStat({
  label,
  value,
  tone = 'default',
  edge = 'primary',
}: {
  label: string;
  value: string;
  tone?: 'default' | 'pr';
  edge?: 'primary' | 'success' | 'warning' | 'destructive';
}) {
  // Calibrated stat tile (UX-01): steel Card, a plate-colour top edge for status, the figure stencilled
  // large in the display face. Structure from the border, never a shadow.
  return (
    <div
      className={cn(
        'rounded-xl border border-t-[3px] bg-card p-3.5',
        tone === 'pr' ? 'border-pr bg-pr-soft text-pr-soft-foreground' : SUMMARY_EDGE[edge],
      )}
    >
      <dt className="text-xs font-medium text-muted-foreground">{label}</dt>
      <dd className="mt-0.5 num-xl">{value}</dd>
    </div>
  );
}

function CompletedView({
  data,
  drafts,
}: {
  data: WorkoutPlayerData;
  drafts: Record<string, SetDraft[]>;
}) {
  const allDrafts = Object.values(drafts).flat();
  const setsCompleted = allDrafts.filter((s) => s.completed).length;
  const totalVolume = allDrafts
    .filter((s) => s.completed)
    .reduce((sum, s) => sum + (toNum(s.weight) ?? 0) * (toNum(s.reps) ?? 0), 0);
  const prCount = allDrafts.filter((s) => s.isPr).length;
  const duration =
    data.completedAt != null
      ? mmss(new Date(data.completedAt).getTime() - new Date(data.startedAt).getTime())
      : '—';

  return (
    <div className="mx-auto flex min-h-dvh w-full max-w-[560px] flex-col gap-6 p-4 sm:p-6">
      <header className="space-y-1">
        <h1 className="text-xl font-semibold">Strong session.</h1>
        <p className="text-sm text-muted-foreground">{data.title}</p>
      </header>
      <dl className="grid grid-cols-2 gap-3">
        <SummaryStat label="Duration" value={duration} edge="primary" />
        <SummaryStat label="Sets logged" value={String(setsCompleted)} edge="primary" />
        <SummaryStat label="Total volume" value={`${Math.round(totalVolume)} kg`} edge="success" />
        <SummaryStat
          label="Session RPE"
          value={data.sessionRpe == null ? '—' : String(data.sessionRpe)}
          edge="warning"
        />
      </dl>
      {prCount > 0 && (
        <p className="flex pr-pop items-center gap-2.5 rounded-xl border-l-[5px] border-pr bg-pr-soft px-4 py-3 text-sm font-semibold text-pr-soft-foreground">
          <span className="inline-block size-2.5 flex-none rounded-full bg-pr" aria-hidden />
          {prCount} new {prCount === 1 ? 'personal record' : 'personal records'}
        </p>
      )}
      {data.clientNotes && (
        <section className="space-y-1 rounded-xl border bg-muted/40 p-4">
          <p className="text-sm font-medium">Your note</p>
          <p className="text-sm whitespace-pre-wrap">{data.clientNotes}</p>
        </section>
      )}
      <Button asChild variant="outline" size="lg" className="mt-auto">
        <Link href="/client">Back to Today</Link>
      </Button>
    </div>
  );
}
