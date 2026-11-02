import { connection } from 'next/server';
import { PageHeader } from '@/components/shared/page-header';
import { Button } from '@/components/ui/button';
import { createClient } from '@/lib/supabase/server';
import { signOutAction } from '@/features/auth/actions';
import { TrainerCheckinDefaultForm } from '@/features/checkins/components/trainer-checkin-default-form';

// Reads the session (the trainer's current default check-in day), so it renders dynamically (L-002).
export const instant = false;

export default async function CoachSettingsPage() {
  await connection();
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const { data: trainer } = user
    ? await supabase
        .from('trainers')
        .select('default_checkin_weekday')
        .eq('id', user.id)
        .maybeSingle()
    : { data: null };

  return (
    <div className="space-y-6 p-4 sm:p-6 lg:p-8">
      <PageHeader title="Settings" description="Your account and store settings." />

      <section className="space-y-3 rounded-xl border bg-card p-4">
        <div>
          <p className="text-sm font-medium">Weekly check-ins</p>
          <p className="text-sm text-muted-foreground">
            The default day a client’s weekly check-in becomes due.
          </p>
        </div>
        <TrainerCheckinDefaultForm currentWeekday={trainer?.default_checkin_weekday ?? null} />
      </section>

      <div className="rounded-xl border bg-card p-4">
        <div className="flex items-center justify-between gap-4">
          <div>
            <p className="text-sm font-medium">Account</p>
            <p className="text-sm text-muted-foreground">Sign out of PT Platform on this device.</p>
          </div>
          <form action={signOutAction}>
            <Button variant="outline" type="submit">
              Sign out
            </Button>
          </form>
        </div>
      </div>
    </div>
  );
}
