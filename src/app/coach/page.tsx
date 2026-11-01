import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { PageHeader } from '@/components/shared/page-header';
import { Button } from '@/components/ui/button';
import { signOutAction } from '@/features/auth/actions';
import { SetupChecklist } from '@/features/onboarding/components/setup-checklist';

export const instant = false;

export default async function CoachHomePage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  // A trainer who hasn't finished onboarding has no trainers row yet.
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
    <main className="mx-auto max-w-5xl space-y-6 p-4 sm:p-6 lg:p-8">
      <PageHeader
        title="Today"
        description="Your coaching at a glance."
        action={
          <form action={signOutAction}>
            <Button variant="outline" type="submit">
              Sign out
            </Button>
          </form>
        }
      />
      <SetupChecklist
        hasClient={(count ?? 0) > 0}
        storefrontPublished={trainer.storefront_published}
      />
    </main>
  );
}
