import { FileText } from 'lucide-react';
import { PlaceholderScreen } from '@/components/shared/placeholder-screen';

export default function CoachFormsPage() {
  return (
    <PlaceholderScreen
      title="Forms"
      icon={FileText}
      emptyTitle="No forms yet"
      emptyDescription="Create check-in and intake forms to send to your clients."
    />
  );
}
