import { describe, expect, it } from 'vitest';
import {
  assignedToLabel,
  defaultStartDate,
  setSummary,
  usedByCounts,
  type PreviewSet,
} from '@/features/programs/lib';

const set = (over: Partial<PreviewSet> = {}): PreviewSet => ({
  set_number: 1,
  reps_min: null,
  reps_max: null,
  weight_kg: null,
  percent_1rm: null,
  rpe: null,
  duration_sec: null,
  ...over,
});

describe('setSummary', () => {
  it('reads the lowest-numbered set and counts the rest', () => {
    expect(
      setSummary([
        set({ set_number: 2, reps_min: 5 }),
        set({ set_number: 1, reps_min: 8, reps_max: 10 }),
      ]),
    ).toBe('2 × 8–10');
  });

  it('renders a rep range, a weight and an RPE', () => {
    expect(setSummary([set({ reps_min: 5, weight_kg: 100, rpe: 8 })])).toBe(
      '1 × 5 · 100kg · RPE 8',
    );
  });

  it('prefers %1RM load when there is no weight', () => {
    expect(setSummary([set({ reps_min: 5, percent_1rm: 80 })])).toBe('1 × 5 · 80%');
  });

  it('renders a duration for timed sets', () => {
    expect(setSummary([set({ duration_sec: 30 }), set({ set_number: 2, duration_sec: 30 })])).toBe(
      '2 × 30s',
    );
  });

  it('handles no sets', () => {
    expect(setSummary([])).toBe('No sets yet');
  });
});

describe('usedByCounts', () => {
  it('counts client copies by their source template, ignoring templates', () => {
    const counts = usedByCounts([
      { id: 't1', is_template: true, source_program_id: null },
      { id: 't2', is_template: true, source_program_id: null },
      { id: 'c1', is_template: false, source_program_id: 't1' },
      { id: 'c2', is_template: false, source_program_id: 't1' },
      { id: 'c3', is_template: false, source_program_id: 't2' },
      { id: 'c4', is_template: false, source_program_id: null },
    ]);
    expect(counts).toEqual({ t1: 2, t2: 1 });
  });
});

describe('defaultStartDate', () => {
  it('returns the next Monday as yyyy-MM-dd', () => {
    // 2026-11-02 is a Monday → next Monday is the 9th.
    expect(defaultStartDate(new Date('2026-11-02T10:00:00'))).toBe('2026-11-09');
    // 2026-11-04 is a Wednesday → next Monday is the 9th.
    expect(defaultStartDate(new Date('2026-11-04T10:00:00'))).toBe('2026-11-09');
  });
});

describe('assignedToLabel', () => {
  it('names one, two or many clients', () => {
    expect(assignedToLabel(['Rami'])).toBe('Program assigned to Rami.');
    expect(assignedToLabel(['Rami', 'Maya'])).toBe('Program assigned to Rami and 1 other.');
    expect(assignedToLabel(['Rami', 'Maya', 'Sara'])).toBe(
      'Program assigned to Rami and 2 others.',
    );
  });

  it('falls back when the list is empty', () => {
    expect(assignedToLabel([])).toBe('Program assigned.');
  });
});
