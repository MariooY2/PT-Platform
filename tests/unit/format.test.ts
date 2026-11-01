import { describe, expect, it } from 'vitest';
import {
  formatAbsoluteDate,
  formatDuration,
  formatMoney,
  formatRelativeDate,
  formatReps,
  formatSet,
  formatTime,
  formatWeightValue,
  kgToLb,
  lbToKg,
} from '@/lib/format';

describe('formatMoney', () => {
  it('shows whole dollars without decimals and fractions with two', () => {
    expect(formatMoney(49, 'USD')).toBe('$49');
    expect(formatMoney(49.5, 'USD')).toBe('$49.50');
    expect(formatMoney(1200, 'USD')).toBe('$1,200');
  });
  it('shows LBP with thousands separators and no decimals', () => {
    expect(formatMoney(1_500_000, 'LBP')).toBe('LBP 1,500,000');
  });
});

describe('weight', () => {
  it('converts kg↔lb', () => {
    expect(kgToLb(100)).toBeCloseTo(220.462, 2);
    expect(lbToKg(220.462)).toBeCloseTo(100, 2);
  });
  it('formats kg with one decimal max, unit shown', () => {
    expect(formatWeightValue(62.5)).toEqual({ value: '62.5', unit: 'kg' });
    expect(formatWeightValue(60)).toEqual({ value: '60', unit: 'kg' });
    expect(formatWeightValue(62.53)).toEqual({ value: '62.5', unit: 'kg' });
  });
  it('formats in lb for imperial', () => {
    expect(formatWeightValue(100, 'imperial')).toEqual({ value: '220.5', unit: 'lb' });
  });
  it('formats a set as "62.5 kg × 8"', () => {
    expect(formatSet(62.5, 8)).toBe('62.5 kg × 8');
  });
});

describe('reps and duration', () => {
  it('formats reps', () => {
    expect(formatReps(8)).toBe('8');
  });
  it('formats duration', () => {
    expect(formatDuration(45)).toBe('45 s');
    expect(formatDuration(90)).toBe('1:30');
    expect(formatDuration(3723)).toBe('1:02:03');
  });
});

describe('dates (day-first)', () => {
  const base = new Date(2026, 10, 10, 12, 0, 0); // 10 Nov 2026, noon

  it('formats absolute dates day-first, year only when different', () => {
    expect(formatAbsoluteDate(new Date(2026, 10, 3), base)).toBe('3 Nov');
    expect(formatAbsoluteDate(new Date(2025, 10, 3), base)).toBe('3 Nov 2025');
  });

  it('formats 12-hour times', () => {
    expect(formatTime(new Date(2026, 10, 10, 18, 30))).toBe('6:30 pm');
  });

  it('formats relative dates', () => {
    expect(formatRelativeDate(new Date(2026, 10, 10, 10, 0, 0), base)).toBe('2 h ago');
    expect(formatRelativeDate(new Date(2026, 10, 10, 11, 45, 0), base)).toBe('15 min ago');
    expect(formatRelativeDate(new Date(2026, 10, 9, 12, 0, 0), base)).toBe('Yesterday');
    expect(formatRelativeDate(new Date(2026, 10, 3, 12, 0, 0), base)).toBe('3 Nov');
  });
});
