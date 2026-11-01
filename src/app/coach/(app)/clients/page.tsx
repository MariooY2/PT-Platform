import { Suspense } from 'react';
import { PageHeader } from '@/components/shared/page-header';
import { ListSkeleton } from '@/components/shared/states';
import { createClient } from '@/lib/supabase/server';
import { listClients } from '@/features/clients/queries';
import { ClientsList } from '@/features/clients/components/clients-list';
import { DataError } from '@/features/clients/components/data-error';
import { InviteClientButton } from '@/features/clients/components/invite-client-button';

export default async function CoachClientsPage({
  searchParams,
}: {
  searchParams: Promise<{ state?: string }>;
}) {
  const { state } = await searchParams;
  // The no-results state is reachable by pre-filling a search that matches nothing.
  const initialQuery = state === 'no-results' ? 'zzz-no-match' : '';

  return (
    <div className="space-y-6 p-4 sm:p-6 lg:p-8">
      <PageHeader
        title="Clients"
        description="Everyone you coach, with their status, tags and start date."
        action={<InviteClientButton />}
      />
      <Suspense fallback={<ListSkeleton rows={6} />}>
        <ClientsData initialQuery={initialQuery} />
      </Suspense>
    </div>
  );
}

async function ClientsData({ initialQuery }: { initialQuery: string }) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return <DataError description="Sign in again to see your clients." />;

  const { items, error } = await listClients(supabase, user.id);
  if (error || !items) return <DataError description="We couldn’t load your clients." />;

  return <ClientsList items={items} initialQuery={initialQuery} />;
}
