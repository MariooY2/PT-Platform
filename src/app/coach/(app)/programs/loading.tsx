import { PageHeader } from '@/components/shared/page-header';
import { Skeleton } from '@/components/ui/skeleton';

// Shaped like the loaded Programs list (header + tabs + card grid) so nothing shifts in.
export default function Loading() {
  return (
    <div className="space-y-6 p-4 sm:p-6 lg:p-8">
      <PageHeader
        title="Programs"
        description="Your templates and the programs you've assigned to clients."
        action={<Skeleton className="h-11 w-36 rounded-md" />}
      />
      <div className="space-y-4" aria-hidden>
        <Skeleton className="h-9 w-56 rounded-md" />
        <ul className="grid grid-cols-1 gap-2 lg:grid-cols-2 lg:gap-4 xl:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <li key={i}>
              <Skeleton className="h-20 w-full rounded-xl" />
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
