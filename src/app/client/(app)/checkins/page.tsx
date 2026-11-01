import { connection } from 'next/server';
import { ClipboardCheck } from 'lucide-react';
import { PlaceholderScreen } from '@/components/shared/placeholder-screen';

// Under the client (app) intake gate (dynamic layout), so this route renders dynamically too (L-002).
export const instant = false;

export default async function ClientCheckinsPage() {
  await connection();
  return (
    <PlaceholderScreen
      title="Check-ins"
      icon={ClipboardCheck}
      emptyTitle="No check-ins yet"
      emptyDescription="When your coach sends a check-in, you answer it here."
    />
  );
}
