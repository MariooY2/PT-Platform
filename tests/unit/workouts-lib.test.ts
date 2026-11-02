import { describe, expect, it } from 'vitest';
import {
  epley,
  findScheduledForDate,
  nextScheduledAfter,
  prefillSet,
  restRemainingMs,
  scheduledDateFor,
} from '@/features/workouts/lib';

describe('scheduledDateFor', () => {
  it('maps week 1 day 1 to the start date', () => {
    expect(scheduledDateFor('2026-11-02', 1, 1)).toBe('2026-11-02');
  });
  it('adds 7 days per week and 1 per day', () => {
    expect(scheduledDateFor('2026-11-02', 1, 2)).toBe('2026-11-03'); // day 2
    expect(scheduledDateFor('2026-11-02', 2, 1)).toBe('2026-11-09'); // week 2
    expect(scheduledDateFor('2026-11-02', 3, 2)).toBe('2026-11-17'); // +14 +1
  });
});

describe('findScheduledForDate', () => {
  const workouts = [
    { week: 1, day: 1, id: 'a' },
    { week: 1, day: 3, id: 'b' },
    { week: 2, day: 1, id: 'c' },
  ];
  it('finds the workout whose calendar date is today', () => {
    expect(findScheduledForDate(workouts, '2026-11-02', '2026-11-02')?.id).toBe('a');
    expect(findScheduledForDate(workouts, '2026-11-02', '2026-11-04')?.id).toBe('b');
    expect(findScheduledForDate(workouts, '2026-11-02', '2026-11-09')?.id).toBe('c');
  });
  it('returns null on a rest day', () => {
    expect(findScheduledForDate(workouts, '2026-11-02', '2026-11-03')).toBeNull();
  });
});

describe('nextScheduledAfter', () => {
  const workouts = [
    { week: 1, day: 1, id: 'a' },
    { week: 1, day: 3, id: 'b' },
  ];
  it('returns the soonest workout strictly after the date', () => {
    const next = nextScheduledAfter(workouts, '2026-11-02', '2026-11-02');
    expect(next?.workout.id).toBe('b');
    expect(next?.date).toBe('2026-11-04');
  });
  it('returns null when nothing is left', () => {
    expect(nextScheduledAfter(workouts, '2026-11-02', '2026-11-05')).toBeNull();
  });
});

describe('epley', () => {
  it('matches the server trigger: 100 × 5 ≈ 116.67', () => {
    expect(epley(100, 5)).toBeCloseTo(116.666, 2);
  });
  it('equals the weight at 0 reps', () => {
    expect(epley(80, 0)).toBe(80);
  });
});

describe('prefillSet', () => {
  it('uses the prescription weight and the top of the rep range', () => {
    expect(prefillSet({ repsMin: 8, repsMax: 10, weightKg: 62.5 })).toEqual({
      weight: '62.5',
      reps: '10',
    });
  });
  it('falls back to last time when the prescription omits a field', () => {
    expect(
      prefillSet({ repsMin: null, repsMax: null, weightKg: null }, { weightKg: 60, reps: 9 }),
    ).toEqual({ weight: '60', reps: '9' });
  });
  it('prefers the prescription over last time', () => {
    expect(
      prefillSet({ repsMin: 5, repsMax: 5, weightKg: 80 }, { weightKg: 60, reps: 10 }),
    ).toEqual({ weight: '80', reps: '5' });
  });
  it('returns blanks when nothing is known', () => {
    expect(prefillSet({ repsMin: null, repsMax: null, weightKg: null })).toEqual({
      weight: '',
      reps: '',
    });
  });
});

describe('restRemainingMs', () => {
  it('counts down and never goes negative', () => {
    expect(restRemainingMs(10_000, 4_000)).toBe(6_000);
    expect(restRemainingMs(10_000, 12_000)).toBe(0);
  });
});
