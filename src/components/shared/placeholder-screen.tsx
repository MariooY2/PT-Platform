import type { ComponentType } from 'react';
import type { LucideProps } from 'lucide-react';
import { PageHeader } from './page-header';
import { EmptyState } from './states';

// A shell placeholder: page header + the spec's empty-state copy. Real data arrives with the feature.
export function PlaceholderScreen({
  title,
  description,
  icon,
  emptyTitle,
  emptyDescription,
}: {
  title: string;
  description?: string;
  icon?: ComponentType<LucideProps>;
  emptyTitle: string;
  emptyDescription?: string;
}) {
  return (
    <div className="space-y-6 p-4 sm:p-6 lg:p-8">
      <PageHeader title={title} description={description} />
      <EmptyState icon={icon} title={emptyTitle} description={emptyDescription} />
    </div>
  );
}
