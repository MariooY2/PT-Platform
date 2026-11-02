import { z } from 'zod';
import { clientIdSchema } from '@/features/clients/schemas';

/**
 * Check-in scheduling schemas (docs/features.md §7.7, docs/data-model.md §5).
 *
 * A `checkin_schedules` row carries a weekday 0..6. We follow JS `Date.getDay()`:
 * 0 = Sunday … 6 = Saturday. Everything here is pure (no Supabase, no session) so it is
 * unit-testable and shared by the server actions, the due-generation logic and the UI.
 */
export const weekdaySchema = z
  .number()
  .int('Pick a day of the week.')
  .min(0, 'Pick a day of the week.')
  .max(6, 'Pick a day of the week.');

/** Weekday labels, indexed 0 = Sunday … 6 = Saturday (matches `Date.getDay()`). */
export const WEEKDAY_LABELS = [
  'Sunday',
  'Monday',
  'Tuesday',
  'Wednesday',
  'Thursday',
  'Friday',
  'Saturday',
] as const;

/** Set (or change) a client's weekly check-in day. clientId is validated; weekday is 0..6. */
export const setClientCheckinSchema = z.object({
  clientId: clientIdSchema,
  weekday: weekdaySchema,
});
export type SetClientCheckinInput = z.infer<typeof setClientCheckinSchema>;
