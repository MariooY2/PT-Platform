import { PageHeader } from '@/components/shared/page-header';
import { ListSkeleton } from '@/components/shared/states';

export default function Loading() {
  return (
    <div className="space-y-6 p-4 sm:p-6 lg:p-8">
      <PageHeader title="Check-ins" description="Submitted check-ins and intakes, oldest first." />
      <ListSkeleton rows={5} />
    </div>
  );
}
