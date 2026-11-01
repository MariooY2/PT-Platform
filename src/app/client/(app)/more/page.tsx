import { PageHeader } from '@/components/shared/page-header';
import { MoreList } from '@/components/shared/nav/more-list';
import { CLIENT_MORE } from '@/components/shared/nav/nav-items';

export default function ClientMorePage() {
  return (
    <div className="space-y-6 p-4 sm:p-6">
      <PageHeader title="More" />
      <MoreList items={CLIENT_MORE} />
    </div>
  );
}
