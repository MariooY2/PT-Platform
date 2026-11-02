import { Suspense } from 'react';
import { connection } from 'next/server';
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { PageHeader } from '@/components/shared/page-header';
import { InstallPrompt } from '@/features/pwa/components/install-prompt';
import { HabitsSection, HabitsSkeleton } from '@/features/habits/components/habits-section';
import {
  TodayWorkoutSection,
  TodayWorkoutSkeleton,
} from '@/features/workouts/components/today-workout-section';

export const instant = false;

export default async function ClientTodayPage() {
  await connection();
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  return (
    <div className="space-y-6 p-4 sm:p-6">
      <PageHeader title="Today" />
      <Suspense fallback={<TodayWorkoutSkeleton />}>
        <TodayWorkoutSection clientId={user.id} />
      </Suspense>
      <Suspense fallback={<HabitsSkeleton />}>
        <HabitsSection clientId={user.id} />
      </Suspense>
      <InstallPrompt />
    </div>
  );
}
