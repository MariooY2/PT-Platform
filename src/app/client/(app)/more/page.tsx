import { connection } from 'next/server';
import { PageHeader } from '@/components/shared/page-header';
import { MoreList } from '@/components/shared/nav/more-list';
import { CLIENT_MORE } from '@/components/shared/nav/nav-items';

// Under the client (app) intake gate (dynamic layout), so this route renders dynamically too (L-002).
export const instant = false;

export default async function ClientMorePage() {
  await connection();
  return (
    <div className="space-y-6 p-4 sm:p-6">
      <PageHeader title="More" />
      <MoreList items={CLIENT_MORE} />
    </div>
  );
}
