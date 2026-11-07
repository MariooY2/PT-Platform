'use client';

import { useRouter } from 'next/navigation';
import { Scale } from 'lucide-react';
import { EmptyState, ErrorState } from '@/components/shared/states';
import { Skeleton } from '@/components/ui/skeleton';
import { Weight, RelativeDate } from '@/components/format';
import { formatWeightValue } from '@/lib/format';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { LineChart } from './line-chart';
import { LogWeightDialog } from './log-weight-dialog';
import type { BodyMeasurementRow, BodyProgress } from '../types';

const kg = (v: number) => `${formatWeightValue(v).value} kg`;
const cm = (v: number) => `${Math.round(v * 10) / 10} cm`;

/** Skeleton shaped like the Body tab: latest-weight number, chart card, then a few table rows. */
function BodySkeleton() {
  return (
    <div className="space-y-6" aria-hidden>
      <Skeleton className="h-10 w-32" />
      <Skeleton className="h-40 w-full rounded-xl" />
      <div className="space-y-2">
        {Array.from({ length: 3 }).map((_, i) => (
          <Skeleton key={i} className="h-8 w-full" />
        ))}
      </div>
    </div>
  );
}

interface Column {
  key: keyof BodyMeasurementRow;
  label: string;
  render: (r: BodyMeasurementRow) => React.ReactNode;
}

const ALL_COLUMNS: Column[] = [
  {
    key: 'weightKg',
    label: 'Weight',
    render: (r) => (r.weightKg == null ? '—' : <Weight kg={r.weightKg} />),
  },
  {
    key: 'bodyFatPct',
    label: 'Body fat',
    render: (r) => (r.bodyFatPct == null ? '—' : <span className="num">{r.bodyFatPct}%</span>),
  },
  {
    key: 'waistCm',
    label: 'Waist',
    render: (r) => (r.waistCm == null ? '—' : <span className="num">{cm(r.waistCm)}</span>),
  },
  {
    key: 'hipsCm',
    label: 'Hips',
    render: (r) => (r.hipsCm == null ? '—' : <span className="num">{cm(r.hipsCm)}</span>),
  },
  {
    key: 'chestCm',
    label: 'Chest',
    render: (r) => (r.chestCm == null ? '—' : <span className="num">{cm(r.chestCm)}</span>),
  },
  {
    key: 'armCm',
    label: 'Arm',
    render: (r) => (r.armCm == null ? '—' : <span className="num">{cm(r.armCm)}</span>),
  },
  {
    key: 'thighCm',
    label: 'Thigh',
    render: (r) => (r.thighCm == null ? '—' : <span className="num">{cm(r.thighCm)}</span>),
  },
];

export function BodyTab({
  body,
  hadError = false,
  forcedState,
}: {
  body: BodyProgress;
  hadError?: boolean;
  forcedState?: string;
}) {
  const router = useRouter();
  if (forcedState === 'loading') return <BodySkeleton />;
  if (forcedState === 'error' || hadError)
    return (
      <ErrorState
        title="Couldn’t load your body data"
        description="Check your connection and try again."
        onRetry={() => router.refresh()}
      />
    );

  const isEmpty = forcedState === 'empty' || body.rows.length === 0;
  if (isEmpty)
    return (
      <EmptyState
        icon={Scale}
        title="No weigh-ins yet"
        description="Log your weight to start a trend. Measurements are optional."
        action={<LogWeightDialog />}
      />
    );

  // Only show measurement columns that have at least one value, so the table stays narrow on a phone.
  const columns = ALL_COLUMNS.filter((c) => body.rows.some((r) => r[c.key] != null));

  const trend =
    body.deltaWeight == null
      ? `Your first weigh-in: ${formatWeightValue(body.latestWeight ?? 0).value} kg`
      : `Weight ${body.deltaWeight <= 0 ? 'down' : 'up'} ${kg(Math.abs(body.deltaWeight))} since you started`;

  return (
    <div className="space-y-6">
      <div className="rounded-xl border border-t-[3px] border-t-success bg-card p-4">
        <p className="text-xs font-medium text-muted-foreground">Latest weight</p>
        {body.latestWeight == null ? (
          <p className="num-xl text-muted-foreground">—</p>
        ) : (
          <Weight kg={body.latestWeight} className="num-xl" />
        )}
      </div>

      {body.points.length >= 2 ? (
        <div className="rounded-xl border p-4">
          <LineChart
            line={body.average}
            dots={body.points.map((p) => ({ date: p.date, value: p.weightKg }))}
            summary={trend}
            formatValue={kg}
          />
        </div>
      ) : (
        <p className="text-sm text-muted-foreground">{trend}. Log again to see the trend line.</p>
      )}

      <section aria-labelledby="measurements-heading" className="space-y-3">
        <h2 id="measurements-heading" className="text-lg font-medium">
          Measurements
        </h2>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Date</TableHead>
              {columns.map((c) => (
                <TableHead key={c.key} className="text-right">
                  {c.label}
                </TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            {body.rows.map((r) => (
              <TableRow key={r.id}>
                <TableCell>
                  <RelativeDate date={`${r.measuredOn}T12:00:00Z`} absolute />
                </TableCell>
                {columns.map((c) => (
                  <TableCell key={c.key} className="text-right">
                    {c.render(r)}
                  </TableCell>
                ))}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </section>

      <div className="flex justify-end">
        <LogWeightDialog />
      </div>
    </div>
  );
}
