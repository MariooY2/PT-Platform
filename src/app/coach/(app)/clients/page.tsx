import { Users } from 'lucide-react';
import { PlaceholderScreen } from '@/components/shared/placeholder-screen';

export default function CoachClientsPage() {
  return (
    <PlaceholderScreen
      title="Clients"
      icon={Users}
      emptyTitle="No clients yet"
      emptyDescription="Invite your first client to start tracking their training."
    />
  );
}
