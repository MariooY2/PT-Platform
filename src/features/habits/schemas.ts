import { z } from 'zod';

/**
 * Habits are addressed by their row id. Format-only check (not RFC-strict) for the same reason as
 * `clientIdSchema`: the deterministic seed/test ids use variant bits `z.uuid()` rejects, and the real
 * guard is RLS + the session, not the shape.
 */
const UUID_RE = /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/;

export const habitIdSchema = z.string().regex(UUID_RE, 'Invalid id');

/** A log date, `yyyy-MM-dd`. Derived server-side from the client's timezone, never trusted raw. */
export const logDateSchema = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Invalid date');

const HABIT_NAME_MAX = 80;
const HABIT_UNIT_MAX = 20;
const HABIT_TARGET_MAX = 1_000_000;

/** Empty string / nullish → undefined, so an untouched optional field does not fail coercion. */
const optionalTarget = z.preprocess(
  (v) => (v === '' || v === null || v === undefined ? undefined : v),
  z.coerce
    .number()
    .positive('Enter a target above 0.')
    .max(HABIT_TARGET_MAX, 'That target is too large.')
    .optional(),
);

const optionalUnit = z.preprocess(
  (v) => {
    if (typeof v !== 'string') return undefined;
    const t = v.trim();
    return t === '' ? undefined : t;
  },
  z.string().max(HABIT_UNIT_MAX, `Keep the unit under ${HABIT_UNIT_MAX} characters.`).optional(),
);

/** What a coach sets for a habit. `trainer_id`/`client_id` never come from here — they come from the session. */
export const habitInputSchema = z.object({
  name: z
    .string()
    .trim()
    .min(1, 'Name the habit.')
    .max(HABIT_NAME_MAX, `Keep the name under ${HABIT_NAME_MAX} characters.`),
  target: optionalTarget,
  unit: optionalUnit,
});
export type HabitInput = z.input<typeof habitInputSchema>;
export type HabitValues = z.output<typeof habitInputSchema>;
