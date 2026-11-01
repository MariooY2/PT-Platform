import { Skeleton } from '@/components/ui/skeleton';
import { ListSkeleton } from '@/components/shared/states';

export default function CoachClientProfileLoading() {
  return (
    <div className="space-y-6 p-4 sm:p-6 lg:p-8" aria-hidden>
      <div className="flex items-center gap-3">
        <Skeleton className="size-10 rounded-full" />
        <div className="flex-1 space-y-2">
          <Skeleton className="h-6 w-40" />
          <Skeleton className="h-4 w-24" />
        </div>
      </div>
      <Skeleton className="h-8 w-56" />
      <ListSkeleton rows={3} />
    </div>
  );
}
