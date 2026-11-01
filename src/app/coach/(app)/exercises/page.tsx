import { Dumbbell } from 'lucide-react';
import { PlaceholderScreen } from '@/components/shared/placeholder-screen';

export default function CoachExercisesPage() {
  return (
    <PlaceholderScreen
      title="Exercises"
      icon={Dumbbell}
      emptyTitle="No exercises yet"
      emptyDescription="Build an exercise library to reuse moves across your programs."
    />
  );
}
