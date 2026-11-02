import { Skeleton } from '@/components/ui/skeleton';

/** Full-screen player skeleton: header, prescription, three set rows. Reserves space so nothing shifts. */
export default function WorkoutPlayerLoading() {
  return (
    <div className="mx-auto flex h-dvh w-full max-w-[560px] flex-col" aria-hidden>
      <div className="flex shrink-0 items-center gap-3 border-b px-4 py-3">
        <Skeleton className="size-11 rounded-md" />
        <div className="flex-1 space-y-1">
          <Skeleton className="h-4 w-32" />
          <Skeleton className="h-3 w-20" />
        </div>
        <Skeleton className="h-12 w-20 rounded-md" />
      </div>
      <div className="shrink-0 px-4 py-2">
        <Skeleton className="h-2 w-full rounded-full" />
      </div>
      <div className="flex-1 space-y-4 px-4 py-2">
        <Skeleton className="h-5 w-40" />
        <Skeleton className="h-4 w-56" />
        {Array.from({ length: 3 }).map((_, i) => (
          <Skeleton key={i} className="h-14 w-full rounded-md" />
        ))}
      </div>
    </div>
  );
}
