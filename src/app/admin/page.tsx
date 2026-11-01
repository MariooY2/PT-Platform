import { Users } from 'lucide-react';
import { PlaceholderScreen } from '@/components/shared/placeholder-screen';

export default function AdminTrainersPage() {
  return (
    <PlaceholderScreen
      title="Trainers"
      icon={Users}
      emptyTitle="No trainers to review"
      emptyDescription="Trainer accounts and their activity appear here."
    />
  );
}
