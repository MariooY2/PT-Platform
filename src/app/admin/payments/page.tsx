import { CreditCard } from 'lucide-react';
import { PlaceholderScreen } from '@/components/shared/placeholder-screen';

export default function AdminPaymentsPage() {
  return (
    <PlaceholderScreen
      title="Payments"
      icon={CreditCard}
      emptyTitle="No payments yet"
      emptyDescription="Whish payments and their status appear here."
    />
  );
}
