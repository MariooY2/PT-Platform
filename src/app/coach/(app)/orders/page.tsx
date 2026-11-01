import { Receipt } from 'lucide-react';
import { PlaceholderScreen } from '@/components/shared/placeholder-screen';

export default function CoachOrdersPage() {
  return (
    <PlaceholderScreen
      title="Orders"
      icon={Receipt}
      emptyTitle="No orders yet"
      emptyDescription="Orders from your storefront appear here."
    />
  );
}
