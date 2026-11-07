'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { AlertTriangle, ChevronRight, TriangleAlert } from 'lucide-react';
import { PageHeader } from '@/components/shared/page-header';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import { ErrorState } from '@/components/shared/states';
import { StatusChip } from '@/components/shared/status-chip';
import { SetupChecklist } from '@/features/onboarding/components/setup-checklist';
import { RelativeDate } from '@/components/format';
import { Skeleton } from '@/components/ui/skeleton';
import { attentionReason } from '../lib';
import type { CoachTodayData, ReviewRow, TrainingRow } from '../queries';
import type { AttentionItem } from '../lib';

const DESCRIPTION = 'Who needs you today.';

export function CoachToday({
  data,
  storefrontPublished,
  forcedState,
}: {
  data: CoachTodayData;
  storefrontPublished: boolean;
  forcedState?: string;
}) {
  const router = useRouter();

  const showError = forcedState === 'error';
  const showLoading = forcedState === 'loading';
  const forceEmpty = forcedState === 'empty' || forcedState === 'setup-checklist';
  const isEmpty = forceEmpty || !data.hasAnyClient;

  return (
    <div className="space-y-6 p-4 sm:p-6 lg:p-8">
      <PageHeader title="Today" description={DESCRIPTION} />

      {showError ? (
        <ErrorState
          title="Couldn’t load your dashboard"
          description="Check your connection and try again."
          onRetry={() => router.refresh()}
        />
      ) : showLoading ? (
        <TodaySkeleton />
      ) : isEmpty ? (
        <SetupChecklist hasClient={data.hasAnyClient} storefrontPublished={storefrontPublished} />
      ) : (
        <div className="space-y-6">
          <HeroNumbers numbers={data.numbers} />
          <NeedsAttention
            rows={data.attention.rows}
            hadError={data.attention.error}
            onRetry={() => router.refresh()}
          />
          <div className="grid gap-6 lg:grid-cols-2">
            <CheckinsToReview
              rows={data.review.rows}
              hadError={data.review.error}
              onRetry={() => router.refresh()}
            />
            <TodaysTraining
              rows={data.training.rows}
              prCount={data.training.prCount}
              hadError={data.training.error}
              onRetry={() => router.refresh()}
            />
          </div>
        </div>
      )}
    </div>
  );
}

const SECTION_EDGE: Record<string, string> = {
  none: '',
  primary: 'border-t-[3px] border-t-primary',
  success: 'border-t-[3px] border-t-success',
  warning: 'border-t-[3px] border-t-warning',
};

function SectionCard({
  title,
  count,
  edge = 'none',
  children,
}: {
  title: string;
  count?: number;
  edge?: 'none' | 'primary' | 'success' | 'warning';
  children: React.ReactNode;
}) {
  return (
    <section className={cn('space-y-3 rounded-xl border bg-card p-4 sm:p-5', SECTION_EDGE[edge])}>
      <h2 className="text-base font-semibold">
        {title}
        {count != null && count > 0 && (
          <span className="ml-1.5 num text-muted-foreground">({count})</span>
        )}
      </h2>
      {children}
    </section>
  );
}

function SectionError({ onRetry }: { onRetry: () => void }) {
  return (
    <div className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
      <TriangleAlert className="size-4 shrink-0 text-warning" aria-hidden />
      <span>Couldn’t load this section.</span>
      <Button variant="outline" size="sm" onClick={onRetry}>
        Try again
      </Button>
    </div>
  );
}

function CalmLine({ children }: { children: React.ReactNode }) {
  return <p className="text-sm text-muted-foreground">{children}</p>;
}

function NeedsAttention({
  rows,
  hadError,
  onRetry,
}: {
  rows: AttentionItem[];
  hadError: boolean;
  onRetry: () => void;
}) {
  return (
    <SectionCard title="Needs attention" count={rows.length} edge="warning">
      {hadError ? (
        <SectionError onRetry={onRetry} />
      ) : rows.length === 0 ? (
        <CalmLine>Everyone’s on track — no one needs attention right now.</CalmLine>
      ) : (
        <ul className="space-y-1.5">
          {rows.map((row) => (
            <li key={`${row.clientId}-${row.kind}`}>
              <Link
                href={`/coach/clients/${row.clientId}`}
                className="flex min-h-11 items-center gap-3 rounded-lg border px-3 py-2 transition-colors hover:bg-muted/60"
              >
                <span className="min-w-0 flex-1 space-y-0.5">
                  <span className="block truncate text-sm font-medium">{row.clientName}</span>
                  <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
                    <AlertTriangle className="size-3.5 shrink-0 text-warning" aria-hidden />
                    <span className="truncate">{attentionReason(row)}</span>
                  </span>
                </span>
                <span className="shrink-0 text-xs text-muted-foreground">View profile</span>
                <ChevronRight className="size-4 shrink-0 text-muted-foreground" aria-hidden />
              </Link>
            </li>
          ))}
        </ul>
      )}
    </SectionCard>
  );
}

function CheckinsToReview({
  rows,
  hadError,
  onRetry,
}: {
  rows: ReviewRow[];
  hadError: boolean;
  onRetry: () => void;
}) {
  return (
    <SectionCard title="Check-ins to review" count={rows.length} edge="primary">
      {hadError ? (
        <SectionError onRetry={onRetry} />
      ) : rows.length === 0 ? (
        <CalmLine>No check-ins waiting. New ones appear here, oldest first.</CalmLine>
      ) : (
        <ul className="space-y-1.5">
          {rows.map((row) => (
            <li key={row.id}>
              <Link
                href="/coach/checkins"
                className="flex min-h-11 items-center gap-3 rounded-lg border px-3 py-2 transition-colors hover:bg-muted/60"
              >
                <span className="min-w-0 flex-1 space-y-0.5">
                  <span className="block truncate text-sm font-medium">{row.clientName}</span>
                  <span className="block truncate text-xs text-muted-foreground">
                    {row.preview ? (
                      <>
                        {row.preview} · <RelativeDate date={row.submittedAt} />
                      </>
                    ) : (
                      <>
                        Submitted <RelativeDate date={row.submittedAt} />
                      </>
                    )}
                  </span>
                </span>
                <ChevronRight className="size-4 shrink-0 text-muted-foreground" aria-hidden />
              </Link>
            </li>
          ))}
        </ul>
      )}
    </SectionCard>
  );
}

function TodaysTraining({
  rows,
  prCount,
  hadError,
  onRetry,
}: {
  rows: TrainingRow[];
  prCount: number;
  hadError: boolean;
  onRetry: () => void;
}) {
  return (
    <SectionCard title="Today’s training" edge="success">
      {hadError ? (
        <SectionError onRetry={onRetry} />
      ) : (
        <>
          <p className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
            <span>
              <span className="num text-foreground">{rows.length}</span> completed
            </span>
            {prCount > 0 && (
              <StatusChip tone="pr">
                <span className="num">{prCount}</span> {prCount === 1 ? 'PR' : 'PRs'}
              </StatusChip>
            )}
          </p>
          {rows.length === 0 ? (
            <CalmLine>No workouts finished yet today.</CalmLine>
          ) : (
            <ul className="space-y-1.5">
              {rows.map((row) => (
                <li key={row.logId}>
                  <Link
                    href={`/coach/clients/${row.clientId}`}
                    className="flex min-h-11 items-center gap-3 rounded-lg border px-3 py-2 transition-colors hover:bg-muted/60"
                  >
                    <span className="min-w-0 flex-1 space-y-0.5">
                      <span className="block truncate text-sm font-medium">{row.clientName}</span>
                      <span className="block truncate text-xs text-muted-foreground">
                        {row.workoutTitle} · <RelativeDate date={row.completedAt} />
                      </span>
                    </span>
                    <ChevronRight className="size-4 shrink-0 text-muted-foreground" aria-hidden />
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </>
      )}
    </SectionCard>
  );
}

// The coach's morning opens with the one number that matters — 14-day compliance, stencilled large —
// with active clients alongside. Calibrated (UX-01), replacing the small bottom numbers line.
function HeroNumbers({ numbers }: { numbers: CoachTodayData['numbers'] }) {
  const { activeClients, compliancePct } = numbers;
  return (
    <Card edge="primary" className="flex items-end justify-between gap-4 p-5">
      <div>
        <p className="text-xs font-medium text-muted-foreground">14-day compliance</p>
        <div className="mt-1 num-hero">{compliancePct == null ? '—' : `${compliancePct}%`}</div>
      </div>
      <div className="text-right">
        <p className="text-xs font-medium text-muted-foreground">
          {activeClients === 1 ? 'Active client' : 'Active clients'}
        </p>
        <div className="mt-1 num-xl">{activeClients}</div>
      </div>
    </Card>
  );
}

function TodaySkeleton() {
  return (
    <div className="space-y-6" aria-hidden>
      <div className="space-y-3 rounded-xl border p-4 sm:p-5">
        <Skeleton className="h-5 w-40" />
        <Skeleton className="h-11 w-full rounded-lg" />
        <Skeleton className="h-11 w-full rounded-lg" />
      </div>
      <div className="grid gap-6 lg:grid-cols-2">
        {[0, 1].map((i) => (
          <div key={i} className="space-y-3 rounded-xl border p-4 sm:p-5">
            <Skeleton className="h-5 w-40" />
            <Skeleton className="h-11 w-full rounded-lg" />
            <Skeleton className="h-11 w-full rounded-lg" />
          </div>
        ))}
      </div>
      <Skeleton className="h-4 w-64" />
    </div>
  );
}
