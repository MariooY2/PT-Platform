import { cn } from '@/lib/utils';

/**
 * BrandMark — a competition-plate disc with a centre collar, the barbell motif of the "Calibrated"
 * identity (UX-01). Token-only so it works on any surface and in both themes; purely decorative.
 */
export function BrandMark({ className }: { className?: string }) {
  return (
    <span
      aria-hidden
      className={cn(
        'inline-grid size-7 shrink-0 place-items-center rounded-full bg-primary',
        className,
      )}
    >
      <span className="size-2 rounded-full bg-primary-foreground" />
    </span>
  );
}

/**
 * Wordmark — the plate mark + "PT Platform" in the condensed display face. Replaces the hardcoded
 * "PT Platform" strings at the nav, auth and marketing surfaces so a name/logo change is one edit.
 */
export function Wordmark({
  className,
  markClassName,
  textClassName,
}: {
  className?: string;
  markClassName?: string;
  textClassName?: string;
}) {
  return (
    <span className={cn('inline-flex items-center gap-2', className)}>
      <BrandMark className={markClassName} />
      <span className={cn('font-display text-xl tracking-wide', textClassName)}>PT Platform</span>
    </span>
  );
}
