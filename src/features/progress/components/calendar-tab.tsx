'use client';

import { format, parseISO } from 'date-fns';
import { CalendarDays } from 'lucide-react';
import { EmptyState, ErrorState, ListSkeleton } from '@/components/shared/states';
import { cn } from '@/lib/utils';
import { monthMatrix, type DayStatus } from '../lib';
import type { CalendarProgress } from '../types';

const WEEKDAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

const STATUS_WORD: Record<DayStatus, string> = {
  done: 'done',
  partial: 'partial',
  missed: 'missed',
  upcoming: 'scheduled',
};

const STATUS_CELL: Record<DayStatus, string> = {
  done: 'bg-success-soft text-success-soft-foreground font-medium',
  partial: 'bg-warning-soft text-warning-soft-foreground font-medium',
  missed: 'border border-destructive/50 text-destructive-soft-foreground',
  upcoming: 'border border-dashed text-muted-foreground',
};

function Legend() {
  const items: { status: DayStatus; label: string }[] = [
    { status: 'done', label: 'Done' },
    { status: 'partial', label: 'Partial' },
    { status: 'missed', label: 'Missed' },
    { status: 'upcoming', label: 'Scheduled' },
  ];
  return (
    <ul className="flex flex-wrap gap-x-4 gap-y-2">
      {items.map((it) => (
        <li key={it.status} className="flex items-center gap-1.5 text-xs text-muted-foreground">
          <span
            className={cn('inline-block size-3 rounded-sm', STATUS_CELL[it.status])}
            aria-hidden
          />
          {it.label}
        </li>
      ))}
    </ul>
  );
}

export function CalendarTab({
  calendar,
  hadError = false,
  forcedState,
}: {
  calendar: CalendarProgress;
  hadError?: boolean;
  forcedState?: string;
}) {
  if (forcedState === 'loading') return <ListSkeleton rows={4} />;
  if (forcedState === 'error' || hadError)
    return (
      <ErrorState
        title="Couldn’t load your calendar"
        description="Check your connection and try again."
      />
    );

  const monthLabel = format(new Date(calendar.year, calendar.month - 1, 1), 'MMMM yyyy');
  const weeks = monthMatrix(calendar.year, calendar.month);
  const monthPrefix = `${calendar.year}-${String(calendar.month).padStart(2, '0')}`;

  const isEmpty = forcedState === 'empty' || calendar.compliance.total === 0;
  if (isEmpty)
    return (
      <EmptyState
        icon={CalendarDays}
        title={`Nothing logged in ${monthLabel}`}
        description="When you complete or miss scheduled workouts, they show up on this calendar."
      />
    );

  return (
    <div className="space-y-5">
      <div className="space-y-1">
        <h2 className="text-lg font-medium">{monthLabel}</h2>
        <p className="text-sm text-muted-foreground">{calendar.compliance.words}</p>
      </div>

      <Legend />

      <div role="grid" aria-label={`Workout calendar for ${monthLabel}`} className="space-y-1">
        <div role="row" className="grid grid-cols-7 gap-1">
          {WEEKDAYS.map((d) => (
            <div
              key={d}
              role="columnheader"
              className="py-1 text-center text-xs text-muted-foreground"
            >
              {d}
            </div>
          ))}
        </div>
        {weeks.map((week, wi) => (
          <div role="row" key={wi} className="grid grid-cols-7 gap-1">
            {week.map((date) => {
              const inMonth = date.startsWith(monthPrefix);
              const status = calendar.statuses[date];
              const day = parseISO(date).getDate();
              const label = status
                ? `${format(parseISO(date), 'd MMMM')} — ${STATUS_WORD[status]}`
                : format(parseISO(date), 'd MMMM');
              return (
                <div
                  role="gridcell"
                  key={date}
                  aria-label={label}
                  className={cn(
                    'flex aspect-square items-center justify-center rounded-md text-sm num',
                    // Adjacent-month filler days are de-emphasised with the muted token (AA-compliant),
                    // not opacity-30 on text-foreground which composites below 4.5:1 on the dark bg.
                    status
                      ? STATUS_CELL[status]
                      : inMonth
                        ? 'text-foreground'
                        : 'text-muted-foreground',
                  )}
                >
                  {day}
                </div>
              );
            })}
          </div>
        ))}
      </div>
    </div>
  );
}
