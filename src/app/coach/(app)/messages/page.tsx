import { MessageSquare } from 'lucide-react';
import { PlaceholderScreen } from '@/components/shared/placeholder-screen';

export default function CoachMessagesPage() {
  return (
    <PlaceholderScreen
      title="Messages"
      icon={MessageSquare}
      emptyTitle="No messages yet"
      emptyDescription="Your conversations with clients appear here."
    />
  );
}
