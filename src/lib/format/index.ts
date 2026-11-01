import { differenceInCalendarDays, format } from 'date-fns';

export type Currency = 'USD' | 'LBP';
export type UnitSystem = 'metric' | 'imperial';

/** "$49" for whole dollars, "$49.50" otherwise; "LBP 1,500,000" (no decimals). */
export function formatMoney(amount: number, currency: Currency = 'USD'): string {
  if (currency === 'LBP') {
    return `LBP ${new Intl.NumberFormat('en-US', { maximumFractionDigits: 0 }).format(Math.round(amount))}`;
  }
  const whole = Number.isInteger(amount);
  return `$${new Intl.NumberFormat('en-US', {
    minimumFractionDigits: whole ? 0 : 2,
    maximumFractionDigits: 2,
  }).format(amount)}`;
}

export const KG_TO_LB = 2.2046226218;
export const kgToLb = (kg: number) => kg * KG_TO_LB;
export const lbToKg = (lb: number) => lb / KG_TO_LB;

/** Weight stored in kg; shown in kg or lb, one decimal max (trailing .0 stripped). */
export function formatWeightValue(
  kg: number,
  system: UnitSystem = 'metric',
): { value: string; unit: 'kg' | 'lb' } {
  const n = system === 'imperial' ? kgToLb(kg) : kg;
  const rounded = Math.round(n * 10) / 10;
  const value = Number.isInteger(rounded) ? String(rounded) : rounded.toFixed(1);
  return { value, unit: system === 'imperial' ? 'lb' : 'kg' };
}

/** "62.5 kg × 8" */
export function formatSet(kg: number, reps: number, system: UnitSystem = 'metric'): string {
  const { value, unit } = formatWeightValue(kg, system);
  return `${value} ${unit} × ${reps}`;
}

export const formatReps = (reps: number) => String(reps);

/** "45 s", "1:30", "1:02:03" */
export function formatDuration(seconds: number): string {
  const s = Math.max(0, Math.round(seconds));
  if (s < 60) return `${s} s`;
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  const pad = (n: number) => String(n).padStart(2, '0');
  return h > 0 ? `${h}:${pad(m)}:${pad(sec)}` : `${m}:${pad(sec)}`;
}

/** Day-first absolute date: "3 Nov" (same year) or "3 Nov 2026". */
export function formatAbsoluteDate(date: Date, base: Date = new Date()): string {
  const sameYear = date.getFullYear() === base.getFullYear();
  return format(date, sameYear ? 'd MMM' : 'd MMM yyyy');
}

/** 12-hour time, "6:30 pm". */
export function formatTime(date: Date): string {
  return format(date, 'h:mm a').toLowerCase();
}

/**
 * Relative for recent ("Just now", "5 min ago", "2 h ago", "Yesterday"); absolute, day-first, older.
 * All comparisons are against `base` (not the system clock), so it is deterministic and testable.
 */
export function formatRelativeDate(date: Date, base: Date = new Date()): string {
  const diffMs = base.getTime() - date.getTime();
  const dayDiff = differenceInCalendarDays(base, date); // >0 = past, <0 = future
  if (diffMs >= 0) {
    const mins = Math.floor(diffMs / 60000);
    if (mins < 1) return 'Just now';
    if (mins < 60) return `${mins} min ago`;
    if (dayDiff === 0) return `${Math.floor(mins / 60)} h ago`;
  }
  if (dayDiff === 1) return 'Yesterday';
  if (dayDiff === -1) return 'Tomorrow';
  if (dayDiff < 0 && dayDiff >= -7) return `in ${-dayDiff} days`;
  return formatAbsoluteDate(date, base);
}
