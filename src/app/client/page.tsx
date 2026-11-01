import { connection } from 'next/server';
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { PageHeader } from '@/components/shared/page-header';
import { Button } from '@/components/ui/button';
import { signOutAction } from '@/features/auth/actions';

export const instant = false;

// Minimal client landing; the full client app shell is P0-05.
export default async function ClientHomePage() {
  await connection();
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  return (
    <main className="mx-auto max-w-[560px] space-y-6 p-4 sm:p-6">
      <PageHeader
        title="Today"
        description="You’re all set — your coach will add your training here."
        action={
          <form action={signOutAction}>
            <Button variant="outline" type="submit">
              Sign out
            </Button>
          </form>
        }
      />
    </main>
  );
}
