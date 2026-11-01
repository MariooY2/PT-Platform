import { z } from 'zod';
import { EQUIPMENT, EXERCISE_CATEGORIES, MUSCLES } from './taxonomy';

// A custom exercise as entered by a coach. `trainer_id` is NEVER part of this schema — it comes from
// the session in the server action, never from the browser (docs/security.md §6, contract constraint).
export const exerciseInputSchema = z.object({
  name: z
    .string()
    .trim()
    .min(2, 'Enter an exercise name.')
    .max(80, 'Keep the name under 80 characters.'),
  primaryMuscle: z.enum(MUSCLES, { message: 'Choose a primary muscle.' }),
  secondaryMuscles: z.array(z.enum(MUSCLES)).default([]),
  equipment: z.enum(EQUIPMENT).optional(),
  category: z.enum(EXERCISE_CATEGORIES, { message: 'Choose a category.' }),
  videoUrl: z
    .string()
    .trim()
    .url('Enter a valid video link, like https://youtube.com/watch?v=…')
    // Only http(s) — URL() accepts javascript:/data:, which the detail view would render as an href.
    .refine((u) => /^https?:\/\//i.test(u), 'Use a link that starts with http:// or https://.')
    .or(z.literal('')),
  instructions: z.string().trim().max(2000, 'Keep instructions under 2000 characters.'),
});

export type ExerciseInput = z.infer<typeof exerciseInputSchema>;

// Normalise the create-exercise form into values the schema validates. Pure (no Supabase, no session),
// so it is unit-testable and shared by the server action. The equipment select uses a "none" sentinel
// because a Radix Select item cannot carry an empty value.
export function parseExerciseForm(formData: FormData) {
  const equipmentRaw = formData.get('equipment');
  const equipment =
    typeof equipmentRaw === 'string' && equipmentRaw !== '' && equipmentRaw !== 'none'
      ? equipmentRaw
      : undefined;

  return exerciseInputSchema.safeParse({
    name: formData.get('name') ?? '',
    primaryMuscle: formData.get('primaryMuscle') ?? '',
    secondaryMuscles: formData.getAll('secondaryMuscles'),
    equipment,
    category: formData.get('category') ?? '',
    videoUrl: formData.get('videoUrl') ?? '',
    instructions: formData.get('instructions') ?? '',
  });
}
