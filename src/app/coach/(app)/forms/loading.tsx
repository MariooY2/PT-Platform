import { PageHeader } from '@/components/shared/page-header';
import { ListSkeleton } from '@/components/shared/states';
import { Skeleton } from '@/components/ui/skeleton';

export default function Loading() {
  return (
    <div className="space-y-6 p-4 sm:p-6 lg:p-8">
      <PageHeader title="Forms" description="Your intake and check-in forms." />
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[260px_1fr]">
        <ListSkeleton rows={3} />
        <div className="space-y-3">
          <Skeleton className="h-11 w-64 rounded-md" />
          <Skeleton className="h-28 w-full rounded-xl" />
          <Skeleton className="h-28 w-full rounded-xl" />
        </div>
      </div>
    </div>
  );
}
