import { ClipboardCheck } from 'lucide-react';
import { PlaceholderScreen } from '@/components/shared/placeholder-screen';

export default function ClientCheckinsPage() {
  return (
    <PlaceholderScreen
      title="Check-ins"
      icon={ClipboardCheck}
      emptyTitle="No check-ins yet"
      emptyDescription="When your coach sends a check-in, you answer it here."
    />
  );
}
