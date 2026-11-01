import { z } from 'zod';

/**
 * Form question types (docs/data-model.md §5). The `questions` jsonb on a form is an array of these;
 * a `form_response.answers` jsonb is an object keyed by question id. Everything here is pure (no
 * Supabase, no session) so it is unit-testable and shared by the server actions and the UI.
 */
export const QUESTION_TYPES = [
  'text',
  'long_text',
  'number',
  'scale',
  'choice',
  'yes_no',
  'photo',
  'weight',
] as const;
export type QuestionType = (typeof QUESTION_TYPES)[number];

export const QUESTION_TYPE_LABEL: Record<QuestionType, string> = {
  text: 'Short text',
  long_text: 'Long text',
  number: 'Number',
  scale: 'Scale (1–10)',
  choice: 'Choice',
  yes_no: 'Yes / no',
  photo: 'Photo',
  weight: 'Weight',
};

// A choice question carries at least two unique options; a photo question can never be required
// (we don't collect the upload yet — see the contract's out-of-scope). Both are enforced here so a
// hand-crafted payload can't slip past the UI's guards.
export const questionSchema = z
  .object({
    id: z.string().regex(/^[a-z0-9_-]{1,40}$/i, 'Question id must be short and alphanumeric.'),
    type: z.enum(QUESTION_TYPES),
    label: z.string().trim().min(1, 'Give the question a label.').max(200, 'Keep labels short.'),
    required: z.boolean(),
    options: z.array(z.string().trim().min(1).max(100)).max(20).optional(),
  })
  .superRefine((q, ctx) => {
    if (q.type === 'choice') {
      const opts = q.options ?? [];
      if (opts.length < 2) {
        ctx.addIssue({ code: 'custom', message: 'Add at least two choices.', path: ['options'] });
      } else if (new Set(opts).size !== opts.length) {
        ctx.addIssue({ code: 'custom', message: 'Choices must be unique.', path: ['options'] });
      }
    }
    if (q.type === 'photo' && q.required) {
      ctx.addIssue({
        code: 'custom',
        message: 'Photo questions can’t be required.',
        path: ['required'],
      });
    }
  });
export type Question = z.infer<typeof questionSchema>;

export const questionsSchema = z
  .array(questionSchema)
  .min(1, 'A form needs at least one question.')
  .max(50, 'Keep a form under 50 questions.')
  .superRefine((qs, ctx) => {
    const ids = qs.map((q) => q.id);
    if (new Set(ids).size !== ids.length) {
      ctx.addIssue({ code: 'custom', message: 'Each question needs a unique id.' });
    }
  });

export const formTitleSchema = z
  .string()
  .trim()
  .min(2, 'Give the form a title.')
  .max(80, 'Keep the title under 80 characters.');

export const formKindSchema = z.enum(['intake', 'checkin']);

export const saveFormSchema = z.object({
  title: formTitleSchema,
  questions: questionsSchema,
});

export const createFormSchema = z.object({
  title: formTitleSchema,
  kind: formKindSchema,
});

export type AnswerValue = string | number | boolean | null;
export type Answers = Record<string, AnswerValue>;

export type AnswerValidation =
  { ok: true; value: Answers } | { ok: false; errors: Record<string, string> };

/**
 * Validate a client's answers against a form's questions. `draft` allows anything missing (saving a
 * partial response); `submit` enforces every required question and the per-type shape. Returns a
 * normalised answers object (numbers coerced, blanks dropped) so the server stores clean data.
 */
export function validateAnswers(
  questions: Question[],
  raw: Record<string, unknown>,
  mode: 'draft' | 'submit',
): AnswerValidation {
  const errors: Record<string, string> = {};
  const value: Answers = {};

  for (const q of questions) {
    const given = raw[q.id];
    const blank = given === undefined || given === null || given === '';

    if (blank) {
      if (mode === 'submit' && q.required) {
        errors[q.id] = 'This question is required.';
      }
      continue;
    }

    switch (q.type) {
      case 'text':
      case 'long_text': {
        const s = String(given).trim();
        if (!s) {
          if (mode === 'submit' && q.required) errors[q.id] = 'This question is required.';
        } else if (s.length > 5000) {
          errors[q.id] = 'Keep your answer under 5000 characters.';
        } else {
          value[q.id] = s;
        }
        break;
      }
      case 'number':
      case 'weight': {
        const n = typeof given === 'number' ? given : Number(String(given).trim());
        if (!Number.isFinite(n) || n < 0 || n > 100000) {
          errors[q.id] = 'Enter a number.';
        } else {
          value[q.id] = n;
        }
        break;
      }
      case 'scale': {
        const n = typeof given === 'number' ? given : Number(String(given).trim());
        if (!Number.isInteger(n) || n < 1 || n > 10) {
          errors[q.id] = 'Choose a number from 1 to 10.';
        } else {
          value[q.id] = n;
        }
        break;
      }
      case 'choice': {
        const s = String(given);
        if (!(q.options ?? []).includes(s)) {
          errors[q.id] = 'Choose one of the options.';
        } else {
          value[q.id] = s;
        }
        break;
      }
      case 'yes_no': {
        if (typeof given === 'boolean') value[q.id] = given;
        else if (given === 'true' || given === 'yes') value[q.id] = true;
        else if (given === 'false' || given === 'no') value[q.id] = false;
        else errors[q.id] = 'Choose yes or no.';
        break;
      }
      case 'photo': {
        // Photo capture is a follow-up (contract out-of-scope); accept a stored path if one ever
        // arrives, otherwise ignore. Never required.
        if (typeof given === 'string' && given.trim()) value[q.id] = given.trim();
        break;
      }
    }
  }

  return Object.keys(errors).length ? { ok: false, errors } : { ok: true, value };
}
