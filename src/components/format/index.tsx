import { cn } from '@/lib/utils';
import {
  formatAbsoluteDate,
  formatDuration,
  formatMoney,
  formatRelativeDate,
  formatReps,
  formatWeightValue,
  type Currency,
  type UnitSystem,
} from '@/lib/format';

/** Price. Big condensed tabular figures. */
export function Money({
  amount,
  currency = 'USD',
  className,
}: {
  amount: number;
  currency?: Currency;
  className?: string;
}) {
  return <span className={cn('num', className)}>{formatMoney(amount, currency)}</span>;
}

/** Weight with a smaller, muted unit: 62.5 kg. */
export function Weight({
  kg,
  system = 'metric',
  className,
}: {
  kg: number;
  system?: UnitSystem;
  className?: string;
}) {
  const { value, unit } = formatWeightValue(kg, system);
  return (
    <span className={className}>
      <span className="num">{value}</span>
      <span className="ml-1 text-xs text-muted-foreground">{unit}</span>
    </span>
  );
}

/** Reps count with a muted "reps" unit. */
export function Reps({
  reps,
  showUnit = true,
  className,
}: {
  reps: number;
  showUnit?: boolean;
  className?: string;
}) {
  return (
    <span className={className}>
      <span className="num">{formatReps(reps)}</span>
      {showUnit && <span className="ml-1 text-xs text-muted-foreground">reps</span>}
    </span>
  );
}

/** Duration: "45 s", "1:30". */
export function Duration({ seconds, className }: { seconds: number; className?: string }) {
  return <span className={cn('num', className)}>{formatDuration(seconds)}</span>;
}

/** Relative date ("2 h ago", "Yesterday") or absolute, day-first. */
export function RelativeDate({
  date,
  absolute = false,
  className,
}: {
  date: Date | string;
  absolute?: boolean;
  className?: string;
}) {
  const d = typeof date === 'string' ? new Date(date) : date;
  const text = absolute ? formatAbsoluteDate(d) : formatRelativeDate(d);
  return (
    <time dateTime={d.toISOString()} className={className}>
      {text}
    </time>
  );
}
