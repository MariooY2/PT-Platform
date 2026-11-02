import { Skeleton } from '@/components/ui/skeleton';
import { ListSkeleton } from '@/components/shared/states';

export default function ClientCheckinsLoading() {
  return (
    <div className="mx-auto w-full max-w-[560px] space-y-6 p-4 sm:p-6" aria-hidden>
      <div className="space-y-2">
        <Skeleton className="h-8 w-40" />
        <Skeleton className="h-4 w-56" />
      </div>
      <ListSkeleton rows={3} />
    </div>
  );
}
