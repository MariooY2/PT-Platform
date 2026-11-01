import { connection } from 'next/server';
import { notFound, redirect } from 'next/navigation';
import Link from 'next/link';
import type { AnswerValue } from '@/features/forms/schemas';
import { createClient } from '@/lib/supabase/server';
import { getResponseForClient } from '@/features/forms/queries';
import { AnswersView } from '@/features/forms/components/answers-view';
import { CheckinFill } from '@/features/forms/components/checkin-fill';
import { Button } from '@/components/ui/button';

// Reads the session + a dynamic param, so the route renders dynamically (Next 16 cacheComponents).
export const instant = false;

export default async function ClientCheckinPage({ params }: { params: Promise<{ id: string }> }) {
  // Force dynamic rendering before the Supabase session read (L-002).
  await connection();
  const { id } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const response = await getResponseForClient(supabase, user.id, id);
  if (!response) notFound();

  if (!response.submittedAt) {
    return (
      <CheckinFill
        responseId={response.id}
        formTitle={response.formTitle}
        questions={response.questions}
        initialAnswers={response.answers as Record<string, AnswerValue>}
      />
    );
  }

  return (
    <div className="mx-auto w-full max-w-[560px] space-y-6 p-4 sm:p-6">
      <header className="space-y-1">
        <h1 className="text-xl font-semibold">{response.formTitle}</h1>
        <p className="text-sm text-muted-foreground">
          Sent to your coach. You’ll see the reply here.
        </p>
      </header>

      {response.coachReply ? (
        <section className="space-y-2 rounded-xl border bg-muted/40 p-4">
          <p className="text-sm font-medium">Your coach replied</p>
          <p className="text-sm whitespace-pre-wrap">{response.coachReply}</p>
        </section>
      ) : (
        <p className="rounded-xl border border-dashed p-4 text-sm text-muted-foreground">
          No reply yet. Your coach will respond soon.
        </p>
      )}

      <section className="space-y-3">
        <h2 className="text-sm font-medium text-muted-foreground">Your answers</h2>
        <AnswersView questions={response.questions} answers={response.answers} />
      </section>

      <Button asChild variant="outline">
        <Link href="/client">Back to Today</Link>
      </Button>
    </div>
  );
}
