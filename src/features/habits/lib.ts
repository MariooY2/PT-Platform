import { formatInTimeZone } from 'date-fns-tz';

/** Lebanon default when a profile has no timezone set (the column is non-null, this is a safety net). */
export const DEFAULT_TIMEZONE = 'Asia/Beirut';

/**
 * The client's "today" as a `yyyy-MM-dd` string in their own timezone. The Today page and the tick
 * action both derive the log date from this one helper, so a tick always writes — and reads back —
 * the same calendar day. The date is never taken from the browser.
 */
export function todayFor(timezone: string | null | undefined, now: Date = new Date()): string {
  return formatInTimeZone(now, timezone || DEFAULT_TIMEZONE, 'yyyy-MM-dd');
}

/**
 * The measurable part of a habit, split so the number keeps its `num` treatment and the unit stays
 * muted (like the `Weight` component). Returns `null` when the coach set neither a target nor a unit.
 */
export function habitTargetParts(
  target: number | null | undefined,
  unit: string | null | undefined,
): { value: string | null; unit: string | null } | null {
  const hasTarget = target != null && Number.isFinite(target);
  const cleanUnit = typeof unit === 'string' ? unit.trim() : '';
  const hasUnit = cleanUnit !== '';
  if (!hasTarget && !hasUnit) return null;
  return {
    value: hasTarget ? new Intl.NumberFormat('en-US').format(target as number) : null,
    unit: hasUnit ? cleanUnit : null,
  };
}
