import { Tag } from 'lucide-react';
import { PlaceholderScreen } from '@/components/shared/placeholder-screen';

export default function CoachProductsPage() {
  return (
    <PlaceholderScreen
      title="Products"
      icon={Tag}
      emptyTitle="No products yet"
      emptyDescription="Create an offer to sell programs or coaching from your storefront."
    />
  );
}
