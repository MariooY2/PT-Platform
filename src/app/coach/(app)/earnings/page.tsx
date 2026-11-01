import { Banknote } from 'lucide-react';
import { PlaceholderScreen } from '@/components/shared/placeholder-screen';

export default function CoachEarningsPage() {
  return (
    <PlaceholderScreen
      title="Earnings"
      icon={Banknote}
      emptyTitle="No earnings yet"
      emptyDescription="Your balance and payouts appear here once you make a sale."
    />
  );
}
