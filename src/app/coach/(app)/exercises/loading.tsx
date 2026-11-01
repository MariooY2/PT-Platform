import { PageHeader } from '@/components/shared/page-header';
import { Skeleton } from '@/components/ui/skeleton';

// Shaped like the loaded page (header + search/filter toolbar + compact cards) so nothing shifts in.
export default function Loading() {
  return (
    <div className="space-y-6 p-4 sm:p-6 lg:p-8">
      <PageHeader
        title="Exercises"
        description="Your exercises and the built-in library. Search, filter, or add your own."
      />
      <div className="space-y-3" aria-hidden>
        <Skeleton className="h-11 w-full rounded-md" />
        <div className="flex flex-wrap gap-2">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-11 w-28 rounded-md" />
          ))}
        </div>
        <Skeleton className="h-4 w-24" />
        <ul className="grid grid-cols-1 gap-2 lg:grid-cols-2 lg:gap-4 xl:grid-cols-3">
          {Array.from({ length: 9 }).map((_, i) => (
            <li key={i}>
              <Skeleton className="h-20 w-full rounded-xl" />
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
