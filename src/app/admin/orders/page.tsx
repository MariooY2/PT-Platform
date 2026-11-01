import { Receipt } from 'lucide-react';
import { PlaceholderScreen } from '@/components/shared/placeholder-screen';

export default function AdminOrdersPage() {
  return (
    <PlaceholderScreen
      title="Orders"
      icon={Receipt}
      emptyTitle="No orders yet"
      emptyDescription="Orders across all trainers appear here."
    />
  );
}
