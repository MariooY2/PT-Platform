import { TrendingUp } from 'lucide-react';
import { PlaceholderScreen } from '@/components/shared/placeholder-screen';

export default function ClientProgressPage() {
  return (
    <PlaceholderScreen
      title="Progress"
      icon={TrendingUp}
      emptyTitle="No progress logged yet"
      emptyDescription="Complete a workout or log your weight to start tracking your progress."
    />
  );
}
