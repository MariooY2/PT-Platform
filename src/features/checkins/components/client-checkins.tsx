'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ChevronRight, ClipboardCheck } from 'lucide-react';
import { PageHeader } from '@/components/shared/page-header';
import { EmptyState, ErrorState, ListSkeleton } from '@/components/shared/states';
import { StatusChip } from '@/components/shared/status-chip';
import { RelativeDate } from '@/components/format';
import type { CheckinHistoryItem, DueCheckin } from '../queries';

export function ClientCheckins({
  due,
  history,
  hadError = false,
  forcedState,
}: {
  due: DueCheckin[];
  history: CheckinHistoryItem[];
  hadError?: boolean;
  forcedState?: string;
}) {
  const router = useRouter();

  const showError = hadError || forcedState === 'error';
  const showLoading = forcedState === 'loading';
  const isEmpty = forcedState === 'empty' || (due.length === 0 && history.length === 0);

  return (
    <div className="mx-auto w-full max-w-[560px] space-y-6 p-4 sm:p-6">
      <PageHeader
        title="Check-ins"
        description="Fill the ones that are due and see your past ones."
      />

      {showError ? (
        <ErrorState
          title="Couldn’t load check-ins"
          description="Check your connection and try again."
          onRetry={() => router.refresh()}
        />
      ) : showLoading ? (
        <ListSkeleton rows={3} />
      ) : isEmpty ? (
        <EmptyState
          icon={ClipboardCheck}
          title="No check-ins yet"
          description="When your coach schedules a check-in, it appears here."
        />
      ) : (
        <div className="space-y-8">
          {due.length > 0 && (
            <section className="space-y-3" aria-labelledby="due-heading">
              <h2 id="due-heading" className="text-sm font-medium text-muted-foreground">
                Due now
              </h2>
              <ul className="space-y-2">
                {due.map((item) => (
                  <li key={item.id}>
                    <Link
                      href={`/client/checkin/${item.id}`}
                      className="flex min-h-11 items-center gap-3 rounded-xl border border-warning/60 bg-warning-soft p-4 transition-colors outline-none hover:bg-warning-soft/80 focus-visible:ring-3 focus-visible:ring-ring/50"
                    >
                      <div className="min-w-0 flex-1 space-y-0.5">
                        <p className="truncate text-sm font-medium">{item.formTitle}</p>
                        <p className="text-xs text-warning-soft-foreground">
                          {item.dueDate ? (
                            <>
                              Due <RelativeDate date={`${item.dueDate}T12:00:00Z`} absolute />
                            </>
                          ) : (
                            'Due now'
                          )}
                        </p>
                      </div>
                      <ChevronRight className="size-4 shrink-0 text-muted-foreground" aria-hidden />
                    </Link>
                  </li>
                ))}
              </ul>
            </section>
          )}

          {history.length > 0 && (
            <section className="space-y-3" aria-labelledby="history-heading">
              <h2 id="history-heading" className="text-sm font-medium text-muted-foreground">
                Past check-ins
              </h2>
              <ul className="space-y-2">
                {history.map((item) => (
                  <li key={item.id}>
                    <Link
                      href={`/client/checkin/${item.id}`}
                      className="flex min-h-11 items-center gap-3 rounded-xl border p-4 transition-colors outline-none hover:bg-muted/60 focus-visible:ring-3 focus-visible:ring-ring/50"
                    >
                      <div className="min-w-0 flex-1 space-y-0.5">
                        <p className="truncate text-sm font-medium">{item.formTitle}</p>
                        <p className="text-xs text-muted-foreground">
                          Sent <RelativeDate date={item.submittedAt} />
                        </p>
                      </div>
                      {item.reviewed ? (
                        <StatusChip tone="success">Reply ready</StatusChip>
                      ) : (
                        <StatusChip tone="neutral">Awaiting reply</StatusChip>
                      )}
                      <ChevronRight className="size-4 shrink-0 text-muted-foreground" aria-hidden />
                    </Link>
                  </li>
                ))}
              </ul>
            </section>
          )}
        </div>
      )}
    </div>
  );
}
