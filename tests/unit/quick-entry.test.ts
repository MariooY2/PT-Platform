import { describe, expect, it } from 'vitest';
import { parseQuickEntry } from '@/features/programs/quick-entry';

describe('parseQuickEntry', () => {
  it('"4x5 @80%" → 4 working sets of 5 at 80% 1RM', () => {
    const r = parseQuickEntry('4x5 @80%');
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.sets).toHaveLength(4);
    expect(r.sets[0]).toMatchObject({ reps_min: 5, reps_max: 5, percent_1rm: 80, weight_kg: null });
  });

  it('"3x8-10 RPE8" → 3 sets, rep range 8–10, RPE 8', () => {
    const r = parseQuickEntry('3x8-10 RPE8');
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.sets).toHaveLength(3);
    expect(r.sets[0]).toMatchObject({ reps_min: 8, reps_max: 10, rpe: 8 });
  });

  it('"5x5 100kg" → 5 sets of 5 at 100 kg', () => {
    const r = parseQuickEntry('5x5 100kg');
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.sets).toHaveLength(5);
    expect(r.sets[0]).toMatchObject({ reps_min: 5, reps_max: 5, weight_kg: 100 });
  });

  it('"3x30s" → 3 time sets of 30 seconds, no reps', () => {
    const r = parseQuickEntry('3x30s');
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.sets).toHaveLength(3);
    expect(r.sets[0]).toMatchObject({ duration_sec: 30, reps_min: null, reps_max: null });
  });

  it('is case-insensitive on rpe/kg', () => {
    const r = parseQuickEntry('3x5 RPE7.5');
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.sets[0].rpe).toBe(7.5);
  });

  for (const bad of ['', 'abc', '4x', 'x5', '3x10-5', '4x5 @80', '4x5 banana', '30x5']) {
    it(`rejects invalid input ${JSON.stringify(bad)} with an error, never a silent drop`, () => {
      const r = parseQuickEntry(bad);
      expect(r.ok).toBe(false);
      if (r.ok) return;
      expect(r.error.length).toBeGreaterThan(0);
    });
  }
});
