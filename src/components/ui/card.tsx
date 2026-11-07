import type { ComponentProps } from 'react';
import { cn } from '@/lib/utils';

/**
 * Card — the "Calibrated" material surface (UX-01). A steel panel built from borders, not shadows
 * (structure comes from edges; shadows are reserved for floating overlays). An optional `edge` paints a
 * plate-colour top stripe that reads status at a glance: primary (20 kg), success (10 kg), warning,
 * destructive (25 kg) or pr (15 kg). Replaces the inline `rounded-xl border bg-card` idiom.
 */
type Edge = 'none' | 'primary' | 'success' | 'warning' | 'destructive' | 'pr';

const EDGE: Record<Edge, string> = {
  none: '',
  primary: 'border-t-[3px] border-t-primary',
  success: 'border-t-[3px] border-t-success',
  warning: 'border-t-[3px] border-t-warning',
  destructive: 'border-t-[3px] border-t-destructive',
  pr: 'border-t-[3px] border-t-pr',
};

export function Card({
  className,
  edge = 'none',
  ...props
}: ComponentProps<'div'> & { edge?: Edge }) {
  return (
    <div
      data-slot="card"
      className={cn('rounded-xl border bg-card text-card-foreground', EDGE[edge], className)}
      {...props}
    />
  );
}

export function CardHeader({ className, ...props }: ComponentProps<'div'>) {
  return (
    <div
      data-slot="card-header"
      className={cn('flex flex-col gap-1 p-4 sm:p-5', className)}
      {...props}
    />
  );
}

export function CardTitle({ className, ...props }: ComponentProps<'h3'>) {
  return (
    <h3 data-slot="card-title" className={cn('text-lg font-semibold', className)} {...props} />
  );
}

export function CardDescription({ className, ...props }: ComponentProps<'p'>) {
  return (
    <p
      data-slot="card-description"
      className={cn('text-sm text-muted-foreground', className)}
      {...props}
    />
  );
}

export function CardContent({ className, ...props }: ComponentProps<'div'>) {
  return (
    <div data-slot="card-content" className={cn('p-4 pt-0 sm:p-5 sm:pt-0', className)} {...props} />
  );
}

/**
 * StatTile — a labelled hero figure on a Card, the core "numbers do the talking" unit. The value uses a
 * num* utility (stencilled display face); the plate-colour edge encodes status.
 */
export function StatTile({
  label,
  edge = 'primary',
  className,
  children,
}: {
  label: string;
  edge?: Edge;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <Card edge={edge} className={cn('p-3.5', className)}>
      <p className="text-xs font-medium text-muted-foreground">{label}</p>
      <div className="mt-0.5 num-lg">{children}</div>
    </Card>
  );
}
