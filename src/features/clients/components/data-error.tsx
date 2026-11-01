'use client';

import { useRouter } from 'next/navigation';
import { ErrorState } from '@/components/shared/states';

/** Error state for a failed data load, with a Try again that re-runs the server fetch. */
export function DataError({ title, description }: { title?: string; description?: string }) {
  const router = useRouter();
  return (
    <ErrorState
      title={title ?? "Something didn't load"}
      description={description ?? 'Check your connection and try again.'}
      onRetry={() => router.refresh()}
    />
  );
}
