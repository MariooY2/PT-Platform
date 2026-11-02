import { StatusChip } from '@/components/shared/status-chip';
import { DAY_LABELS, setSummary } from '../lib';
import type { WeekOnePreview as WeekOnePreviewData } from '../queries';

/**
 * A read-only render of week 1 of a template, shown in the client phone frame (560 px) while
 * assigning. No logging, rest timer or player interactions — that is the workout player (P1-07).
 */
export function WeekOnePreview({ preview }: { preview: WeekOnePreviewData }) {
  const byDay = DAY_LABELS.map((label, i) => ({
    label,
    day: i + 1,
    workouts: preview.workouts
      .filter((w) => w.day === i + 1)
      .sort((a, b) => a.position - b.position),
  })).filter((d) => d.workouts.length > 0);

  return (
    <div
      className="mx-auto w-full max-w-[560px] space-y-3 rounded-2xl border bg-background p-4"
      aria-label="Week 1 preview"
    >
      <p className="text-sm font-medium text-muted-foreground">Week 1 preview</p>
      {byDay.length === 0 ? (
        <p className="py-6 text-center text-sm text-muted-foreground">
          This template has no workouts in week 1 yet.
        </p>
      ) : (
        <ol className="space-y-3">
          {byDay.map(({ label, day, workouts }) => (
            <li key={day} className="space-y-2">
              <p className="text-xs font-medium text-muted-foreground">{label}</p>
              {workouts.map((w) => {
                const rows = w.workout_exercises.slice().sort((a, b) => a.position - b.position);
                return (
                  <div key={w.id} className="space-y-2 rounded-xl border bg-card p-3">
                    <p className="font-medium">{w.title ?? 'Workout'}</p>
                    {rows.length === 0 ? (
                      <p className="text-sm text-muted-foreground">No exercises yet.</p>
                    ) : (
                      <ul className="space-y-1.5">
                        {rows.map((wex) => (
                          <li key={wex.id} className="flex flex-wrap items-center gap-2">
                            {wex.group_label && (
                              <StatusChip tone="info" className="shrink-0">
                                {wex.group_label}
                              </StatusChip>
                            )}
                            <span className="min-w-0 flex-1">
                              <span className="block truncate text-sm font-medium">
                                {wex.exercises?.name ?? 'Exercise'}
                              </span>
                              <span className="text-xs text-muted-foreground">
                                {setSummary(wex.prescribed_sets)}
                              </span>
                            </span>
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                );
              })}
            </li>
          ))}
        </ol>
      )}
    </div>
  );
}
