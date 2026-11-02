'use client';

import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { ErrorState } from '@/components/shared/states';

/** Player-route error boundary: offer a retry and a way back to Today. */
export default function WorkoutPlayerError({ reset }: { error: Error; reset: () => void }) {
  return (
    <div className="mx-auto flex min-h-dvh w-full max-w-[560px] flex-col justify-center gap-4 p-4 sm:p-6">
      <ErrorState
        title="Couldn’t load this workout"
        description="Check your connection and try again."
        onRetry={reset}
      />
      <Button asChild variant="outline" size="lg">
        <Link href="/client">Back to Today</Link>
      </Button>
    </div>
  );
}
