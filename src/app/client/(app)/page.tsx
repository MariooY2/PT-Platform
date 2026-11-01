import { connection } from 'next/server';
import { redirect } from 'next/navigation';
import { Dumbbell } from 'lucide-react';
import { createClient } from '@/lib/supabase/server';
import { PageHeader } from '@/components/shared/page-header';
import { EmptyState } from '@/components/shared/states';
import { InstallPrompt } from '@/features/pwa/components/install-prompt';

export const instant = false;

export default async function ClientTodayPage() {
  await connection();
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  return (
    <div className="space-y-6 p-4 sm:p-6">
      <PageHeader title="Today" />
      <EmptyState
        icon={Dumbbell}
        title="Your coach is preparing your program"
        description="Your training appears here as soon as your coach sets it up."
      />
      <InstallPrompt />
    </div>
  );
}
