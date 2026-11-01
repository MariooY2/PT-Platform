import { connection } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { listReviewQueue } from '@/features/forms/queries';
import { ReviewQueue } from '@/features/forms/components/review-queue';

// Reads the session (cookies) + searchParams, so the route renders dynamically (Next 16 cacheComponents).
export const instant = false;

export default async function CoachCheckinsPage({
  searchParams,
}: {
  searchParams: Promise<{ state?: string }>;
}) {
  // Force dynamic rendering before any Supabase session read (L-002).
  await connection();
  const { state } = await searchParams;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { items, error } = user
    ? await listReviewQueue(supabase, user.id)
    : { items: null, error: 'no session' };

  return (
    <ReviewQueue
      key={state ?? 'default'}
      items={items ?? []}
      hadError={Boolean(error)}
      forcedState={state}
    />
  );
}
