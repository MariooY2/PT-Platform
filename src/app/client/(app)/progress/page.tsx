import { connection } from 'next/server';
import { TrendingUp } from 'lucide-react';
import { PlaceholderScreen } from '@/components/shared/placeholder-screen';

// Under the client (app) intake gate (dynamic layout), so this route renders dynamically too (L-002).
export const instant = false;

export default async function ClientProgressPage() {
  await connection();
  return (
    <PlaceholderScreen
      title="Progress"
      icon={TrendingUp}
      emptyTitle="No progress logged yet"
      emptyDescription="Complete a workout or log your weight to start tracking your progress."
    />
  );
}
