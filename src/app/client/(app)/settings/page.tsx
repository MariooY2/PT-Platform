import { PageHeader } from '@/components/shared/page-header';
import { Button } from '@/components/ui/button';
import { signOutAction } from '@/features/auth/actions';

export default function ClientSettingsPage() {
  return (
    <div className="space-y-6 p-4 sm:p-6">
      <PageHeader title="Settings" description="Your account and preferences." />
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
