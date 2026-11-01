import { PageHeader } from '@/components/shared/page-header';
import { Skeleton } from '@/components/ui/skeleton';

export default function Loading() {
  return (
    <div className="space-y-6 p-4 sm:p-6 lg:p-8">
      <PageHeader title="Exercises" description="Your library and the built-in moves." />
      <div aria-hidden>
        <ul className="grid grid-cols-1 gap-2 lg:grid-cols-2 lg:gap-4 xl:grid-cols-3">
          {Array.from({ length: 8 }).map((_, i) => (
            <li key={i}>
              <Skeleton className="h-20 w-full rounded-xl lg:h-44" />
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
