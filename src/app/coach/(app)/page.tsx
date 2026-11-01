import { connection } from 'next/server';
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { PageHeader } from '@/components/shared/page-header';
import { SetupChecklist } from '@/features/onboarding/components/setup-checklist';

export const instant = false;

export default async function CoachTodayPage() {
  await connection();
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const { data: trainer } = await supabase
    .from('trainers')
    .select('storefront_published')
    .eq('id', user.id)
    .maybeSingle();
  if (!trainer) redirect('/coach/onboarding');

  const { count } = await supabase
    .from('trainer_clients')
    .select('id', { count: 'exact', head: true })
    .eq('trainer_id', user.id);

  return (
    <div className="space-y-6 p-4 sm:p-6 lg:p-8">
      <PageHeader title="Today" description="Your coaching at a glance." />
      <SetupChecklist
        hasClient={(count ?? 0) > 0}
        storefrontPublished={trainer.storefront_published}
      />
    </div>
  );
}
