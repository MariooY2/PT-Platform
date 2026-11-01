import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/lib/utils';

// Word + color. Meaning is never carried by color alone — the label text is always shown.
const statusChip = cva(
  'inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium whitespace-nowrap',
  {
    variants: {
      tone: {
        neutral: 'bg-muted text-muted-foreground',
        info: 'bg-accent text-accent-foreground',
        success: 'bg-success-soft text-success-soft-foreground',
        warning: 'bg-warning-soft text-warning-soft-foreground',
        destructive: 'bg-destructive-soft text-destructive-soft-foreground',
        pr: 'bg-pr-soft text-pr-soft-foreground',
      },
    },
    defaultVariants: { tone: 'neutral' },
  },
);

export type StatusTone = NonNullable<VariantProps<typeof statusChip>['tone']>;

export function StatusChip({
  tone,
  className,
  children,
}: VariantProps<typeof statusChip> & { className?: string; children: React.ReactNode }) {
  return <span className={cn(statusChip({ tone }), className)}>{children}</span>;
}
