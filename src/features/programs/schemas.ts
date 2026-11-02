import { z } from 'zod';
import { isValid, parseISO } from 'date-fns';

// Assign a template to one or more clients. ids/date are shape-checked here; the server action still
// resolves the client list from the session and RLS enforces ownership. No prices/ids are trusted.
export const assignSchema = z.object({
  templateId: z.string().uuid(),
  clientIds: z.array(z.string().uuid()).min(1, 'Pick at least one client.').max(50),
  startDate: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, 'Choose a start date.')
    .refine((s) => isValid(parseISO(s)), 'Choose a valid start date.'),
});
export type AssignInput = z.infer<typeof assignSchema>;

// Create a program. trainer_id is NEVER here — it comes from the session in the server action.
export const newProgramSchema = z.object({
  title: z
    .string()
    .trim()
    .min(2, 'Enter a program name.')
    .max(80, 'Keep the name under 80 characters.'),
  weeks: z.coerce.number().int().min(1, 'At least 1 week.').max(52, 'At most 52 weeks.').default(4),
});
export type NewProgram = z.infer<typeof newProgramSchema>;

export function parseNewProgram(formData: FormData) {
  return newProgramSchema.safeParse({
    title: formData.get('title') ?? '',
    weeks: formData.get('weeks') ?? 4,
  });
}
