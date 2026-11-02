import { describe, expect, it } from 'vitest';
import { WEEKDAY_LABELS, setClientCheckinSchema, weekdaySchema } from '@/features/checkins/schemas';

describe('weekdaySchema', () => {
  it('accepts every weekday 0..6', () => {
    for (let w = 0; w <= 6; w++) expect(weekdaySchema.safeParse(w).success).toBe(true);
  });

  it('rejects out-of-range, non-integer and non-number weekdays', () => {
    expect(weekdaySchema.safeParse(-1).success).toBe(false);
    expect(weekdaySchema.safeParse(7).success).toBe(false);
    expect(weekdaySchema.safeParse(2.5).success).toBe(false);
    expect(weekdaySchema.safeParse('1').success).toBe(false);
  });

  it('labels index 0 = Sunday and 6 = Saturday (matches Date.getDay())', () => {
    expect(WEEKDAY_LABELS[0]).toBe('Sunday');
    expect(WEEKDAY_LABELS[6]).toBe('Saturday');
    expect(WEEKDAY_LABELS).toHaveLength(7);
  });
});

describe('setClientCheckinSchema', () => {
  const clientId = '33333333-0000-0000-0000-000000000001';

  it('accepts a valid client id + weekday', () => {
    expect(setClientCheckinSchema.safeParse({ clientId, weekday: 3 }).success).toBe(true);
  });

  it('rejects a malformed client id', () => {
    expect(setClientCheckinSchema.safeParse({ clientId: 'nope', weekday: 3 }).success).toBe(false);
  });

  it('rejects an out-of-range weekday', () => {
    expect(setClientCheckinSchema.safeParse({ clientId, weekday: 9 }).success).toBe(false);
  });
});
