import { CreditCard } from 'lucide-react';
import { PlaceholderScreen } from '@/components/shared/placeholder-screen';

export default function ClientBillingPage() {
  return (
    <PlaceholderScreen
      title="Billing"
      icon={CreditCard}
      emptyTitle="Nothing to pay"
      emptyDescription="Your plan, renewals and receipts appear here."
    />
  );
}
