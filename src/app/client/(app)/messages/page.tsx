import { MessageSquare } from 'lucide-react';
import { PlaceholderScreen } from '@/components/shared/placeholder-screen';

export default function ClientMessagesPage() {
  return (
    <PlaceholderScreen
      title="Messages"
      icon={MessageSquare}
      emptyTitle="No messages yet"
      emptyDescription="Your conversation with your coach appears here."
    />
  );
}
