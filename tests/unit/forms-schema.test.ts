import { describe, expect, it } from 'vitest';
import {
  questionSchema,
  questionsSchema,
  saveFormSchema,
  validateAnswers,
  type Question,
} from '@/features/forms/schemas';

const q = (over: Partial<Question> = {}): Question =>
  ({ id: 'q1', type: 'text', label: 'Name', required: false, ...over }) as Question;

describe('questionSchema', () => {
  it('accepts a simple question', () => {
    expect(questionSchema.safeParse(q()).success).toBe(true);
  });

  it('requires at least two unique choices for a choice question', () => {
    expect(questionSchema.safeParse(q({ type: 'choice', options: ['a'] })).success).toBe(false);
    expect(questionSchema.safeParse(q({ type: 'choice', options: ['a', 'a'] })).success).toBe(
      false,
    );
    expect(questionSchema.safeParse(q({ type: 'choice', options: ['a', 'b'] })).success).toBe(true);
  });

  it('forbids a required photo question', () => {
    expect(questionSchema.safeParse(q({ type: 'photo', required: true })).success).toBe(false);
    expect(questionSchema.safeParse(q({ type: 'photo', required: false })).success).toBe(true);
  });

  it('rejects an empty label', () => {
    expect(questionSchema.safeParse(q({ label: '   ' })).success).toBe(false);
  });
});

describe('questionsSchema / saveFormSchema', () => {
  it('rejects duplicate ids', () => {
    const res = questionsSchema.safeParse([q({ id: 'dup' }), q({ id: 'dup' })]);
    expect(res.success).toBe(false);
  });

  it('rejects an empty form', () => {
    expect(questionsSchema.safeParse([]).success).toBe(false);
  });

  it('validates title + questions together', () => {
    expect(saveFormSchema.safeParse({ title: 'Intake', questions: [q({ id: 'a' })] }).success).toBe(
      true,
    );
    expect(saveFormSchema.safeParse({ title: 'x', questions: [q()] }).success).toBe(false);
  });
});

describe('validateAnswers', () => {
  const questions: Question[] = [
    q({ id: 'goals', type: 'long_text', required: true, label: 'Goals' }),
    q({ id: 'days', type: 'number', required: true, label: 'Days' }),
    q({ id: 'energy', type: 'scale', required: true, label: 'Energy' }),
    q({ id: 'exp', type: 'choice', required: true, label: 'Experience', options: ['New', 'Pro'] }),
    q({ id: 'ok', type: 'yes_no', required: true, label: 'Ready?' }),
    q({ id: 'weight', type: 'weight', required: false, label: 'Weight' }),
  ];

  it('draft mode allows missing required answers', () => {
    const r = validateAnswers(questions, { goals: 'get strong' }, 'draft');
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.value).toEqual({ goals: 'get strong' });
  });

  it('submit mode flags every missing required answer', () => {
    const r = validateAnswers(questions, {}, 'submit');
    expect(r.ok).toBe(false);
    if (!r.ok) {
      expect(Object.keys(r.errors).sort()).toEqual(['days', 'energy', 'exp', 'goals', 'ok']);
    }
  });

  it('coerces and bounds-checks typed answers on submit', () => {
    const r = validateAnswers(
      questions,
      { goals: 'strength', days: '3', energy: 7, exp: 'Pro', ok: 'yes', weight: '71.5' },
      'submit',
    );
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.value).toEqual({
        goals: 'strength',
        days: 3,
        energy: 7,
        exp: 'Pro',
        ok: true,
        weight: 71.5,
      });
    }
  });

  it('rejects an out-of-range scale, an unknown choice and a non-number', () => {
    const r = validateAnswers(
      questions,
      { goals: 'x', days: 'lots', energy: 11, exp: 'Expert', ok: true },
      'submit',
    );
    expect(r.ok).toBe(false);
    if (!r.ok) {
      expect(r.errors.days).toBeDefined();
      expect(r.errors.energy).toBeDefined();
      expect(r.errors.exp).toBeDefined();
    }
  });
});
