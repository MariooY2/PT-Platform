import { Dumbbell } from 'lucide-react';
import { PlaceholderScreen } from '@/components/shared/placeholder-screen';

export default function CoachProgramsPage() {
  return (
    <PlaceholderScreen
      title="Programs"
      icon={Dumbbell}
      emptyTitle="No programs yet"
      emptyDescription="Programs you build appear here. Start blank or duplicate the sample program."
    />
  );
}
