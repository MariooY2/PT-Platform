import { Banknote } from 'lucide-react';
import { PlaceholderScreen } from '@/components/shared/placeholder-screen';

export default function AdminPayoutsPage() {
  return (
    <PlaceholderScreen
      title="Payouts"
      icon={Banknote}
      emptyTitle="No payouts yet"
      emptyDescription="Trainer payouts and their schedule appear here."
    />
  );
}
