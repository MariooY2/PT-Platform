import { connection } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { InviteForm } from '@/features/auth/components/auth-forms';

export const instant = false;

export default async function InvitePage({ params }: { params: Promise<{ token: string }> }) {
  await connection();
  const { token } = await params;
  const admin = createAdminClient();

  const { data: invite } = await admin
    .from('trainer_clients')
    .select('invite_email, client_id, status, invite_expires_at, trainer_id')
    .eq('invite_token', token)
    .maybeSingle();

  let coachName = 'Your coach';
  if (invite) {
    const { data: trainer } = await admin
      .from('trainers')
      .select('business_name')
      .eq('id', invite.trainer_id)
      .maybeSingle();
    if (trainer?.business_name) coachName = trainer.business_name;
  }

  const valid =
    invite &&
    !invite.client_id &&
    invite.status === 'invited' &&
    invite.invite_email &&
    invite.invite_expires_at &&
    invite.invite_expires_at > new Date().toISOString();

  if (!valid) {
    return (
      <div className="space-y-3 text-center">
        <h1 className="text-2xl font-bold">This invite expired</h1>
        <p className="text-muted-foreground">Ask {coachName} for a new link.</p>
        <p className="text-sm">
          <a href="/login" className="text-primary">
            Already have an account? Sign in
          </a>
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="space-y-1 text-center">
        <h1 className="text-2xl font-bold">{coachName} invited you to train with them</h1>
        <p className="text-sm text-muted-foreground">Create your account to get started.</p>
      </div>
      <InviteForm token={token} email={invite.invite_email!} coachName={coachName} />
    </div>
  );
}
