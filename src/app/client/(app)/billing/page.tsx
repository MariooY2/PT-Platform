import { connection } from 'next/server';
import { CreditCard } from 'lucide-react';
import { PlaceholderScreen } from '@/components/shared/placeholder-screen';

// Under the client (app) intake gate (dynamic layout), so this route renders dynamically too (L-002).
export const instant = false;

export default async function ClientBillingPage() {
  await connection();
  return (
    <PlaceholderScreen
      title="Billing"
      icon={CreditCard}
      emptyTitle="Nothing to pay"
      emptyDescription="Your plan, renewals and receipts appear here."
    />
  );
}
