import { connection } from 'next/server';
import { MessageSquare } from 'lucide-react';
import { PlaceholderScreen } from '@/components/shared/placeholder-screen';

// Under the client (app) intake gate (dynamic layout), so this route renders dynamically too (L-002).
export const instant = false;

export default async function ClientMessagesPage() {
  await connection();
  return (
    <PlaceholderScreen
      title="Messages"
      icon={MessageSquare}
      emptyTitle="No messages yet"
      emptyDescription="Your conversation with your coach appears here."
    />
  );
}
