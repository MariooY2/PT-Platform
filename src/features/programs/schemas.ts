import { z } from 'zod';

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
