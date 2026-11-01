import type { ComponentType, ReactNode } from 'react';
import { Inbox, TriangleAlert, type LucideProps } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';

/** Empty state: what this area is for + one primary action (docs/ui/patterns.md). */
export function EmptyState({
  icon: Icon = Inbox,
  title,
  description,
  action,
  className,
}: {
  icon?: ComponentType<LucideProps>;
  title: string;
  description?: string;
  action?: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        'flex flex-col items-center justify-center gap-3 rounded-xl border border-dashed p-8 text-center',
        className,
      )}
    >
      <Icon className="size-6 text-muted-foreground" aria-hidden />
      <div className="space-y-1">
        <p className="text-lg font-medium">{title}</p>
        {description && (
          <p className="mx-auto max-w-prose text-sm text-muted-foreground">{description}</p>
        )}
      </div>
      {action}
    </div>
  );
}

/** Error state: what failed + Try again. */
export function ErrorState({
  title = "Something didn't load",
  description = 'Check your connection and try again.',
  onRetry,
  retryLabel = 'Try again',
  className,
}: {
  title?: string;
  description?: string;
  onRetry?: () => void;
  retryLabel?: string;
  className?: string;
}) {
  return (
    <div
      className={cn(
        'flex flex-col items-center justify-center gap-3 rounded-xl border p-8 text-center',
        className,
      )}
    >
      <TriangleAlert className="size-6 text-warning" aria-hidden />
      <div className="space-y-1">
        <p className="text-lg font-medium">{title}</p>
        <p className="mx-auto max-w-prose text-sm text-muted-foreground">{description}</p>
      </div>
      {onRetry && (
        <Button variant="outline" onClick={onRetry}>
          {retryLabel}
        </Button>
      )}
    </div>
  );
}

/** Loading skeleton shaped like a list; reserves space so nothing shifts. */
export function ListSkeleton({ rows = 5, className }: { rows?: number; className?: string }) {
  return (
    <div className={cn('space-y-2', className)} aria-hidden>
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="flex items-center gap-3 rounded-xl border p-3">
          <Skeleton className="size-10 rounded-full" />
          <div className="flex-1 space-y-2">
            <Skeleton className="h-4 w-1/3" />
            <Skeleton className="h-3 w-1/2" />
          </div>
          <Skeleton className="h-6 w-16 rounded-full" />
        </div>
      ))}
    </div>
  );
}
