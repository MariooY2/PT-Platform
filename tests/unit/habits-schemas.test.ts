import { describe, expect, it } from 'vitest';
import { habitIdSchema, habitInputSchema, logDateSchema } from '@/features/habits/schemas';
import { habitTargetParts, todayFor } from '@/features/habits/lib';

describe('habitInputSchema', () => {
  it('accepts a name with an optional target and unit', () => {
    const r = habitInputSchema.safeParse({ name: '  Steps ', target: '8000', unit: ' steps ' });
    expect(r.success).toBe(true);
    if (r.success) expect(r.data).toEqual({ name: 'Steps', target: 8000, unit: 'steps' });
  });

  it('treats blank target and unit as unset (no coercion to 0)', () => {
    const r = habitInputSchema.safeParse({ name: 'Water', target: '', unit: '' });
    expect(r.success).toBe(true);
    if (r.success) expect(r.data).toEqual({ name: 'Water', target: undefined, unit: undefined });
  });

  it('rejects an empty name', () => {
    const r = habitInputSchema.safeParse({ name: '   ' });
    expect(r.success).toBe(false);
    if (!r.success) expect(r.error.issues[0]?.message).toBe('Name the habit.');
  });

  it('rejects a non-positive target', () => {
    expect(habitInputSchema.safeParse({ name: 'Steps', target: '0' }).success).toBe(false);
    expect(habitInputSchema.safeParse({ name: 'Steps', target: '-5' }).success).toBe(false);
  });
});

describe('habitIdSchema / logDateSchema', () => {
  it('accepts the deterministic seed id shape and a yyyy-MM-dd date', () => {
    expect(habitIdSchema.safeParse('33333333-0000-0000-0000-000000000001').success).toBe(true);
    expect(logDateSchema.safeParse('2026-11-01').success).toBe(true);
  });

  it('rejects malformed ids and dates', () => {
    expect(habitIdSchema.safeParse('not-a-uuid').success).toBe(false);
    expect(logDateSchema.safeParse('01-11-2026').success).toBe(false);
  });
});

describe('todayFor', () => {
  it('formats the date in the given timezone', () => {
    // 2026-01-01 00:30 UTC is still 2025-12-31 in a far-west zone.
    const instant = new Date('2026-01-01T00:30:00Z');
    expect(todayFor('Asia/Beirut', instant)).toBe('2026-01-01');
    expect(todayFor('America/Los_Angeles', instant)).toBe('2025-12-31');
  });

  it('falls back to the default timezone when none is given', () => {
    const instant = new Date('2026-06-15T09:00:00Z');
    expect(todayFor(null, instant)).toBe('2026-06-15');
  });
});

describe('habitTargetParts', () => {
  it('splits a target and unit for display', () => {
    expect(habitTargetParts(8000, 'steps')).toEqual({ value: '8,000', unit: 'steps' });
  });

  it('handles target-only and unit-only habits', () => {
    expect(habitTargetParts(10, null)).toEqual({ value: '10', unit: null });
    expect(habitTargetParts(null, 'glasses')).toEqual({ value: null, unit: 'glasses' });
  });

  it('returns null when there is nothing to measure', () => {
    expect(habitTargetParts(null, '  ')).toBeNull();
  });
});
