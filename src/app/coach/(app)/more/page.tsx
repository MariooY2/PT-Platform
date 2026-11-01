import { PageHeader } from '@/components/shared/page-header';
import { MoreList } from '@/components/shared/nav/more-list';
import { COACH_MORE } from '@/components/shared/nav/nav-items';

export default function CoachMorePage() {
  return (
    <div className="space-y-6 p-4 sm:p-6 lg:p-8">
      <PageHeader title="More" />
      <MoreList items={COACH_MORE} />
    </div>
  );
}
