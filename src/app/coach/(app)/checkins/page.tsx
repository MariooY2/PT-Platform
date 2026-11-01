import { ClipboardCheck } from 'lucide-react';
import { PlaceholderScreen } from '@/components/shared/placeholder-screen';

export default function CoachCheckinsPage() {
  return (
    <PlaceholderScreen
      title="Check-ins"
      icon={ClipboardCheck}
      emptyTitle="No check-ins to review"
      emptyDescription="When your clients submit check-ins, they appear here, oldest first."
    />
  );
}
