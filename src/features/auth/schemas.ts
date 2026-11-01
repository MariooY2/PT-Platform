import { z } from 'zod';

export const slugSchema = z
  .string()
  .min(3, 'Use at least 3 characters.')
  .max(40, 'Keep it under 40 characters.')
  .regex(/^[a-z0-9-]+$/, 'Lowercase letters, numbers and hyphens only.')
  .regex(/^[a-z0-9]/, 'Start with a letter or number.')
  .regex(/[a-z0-9]$/, 'End with a letter or number.');

export const signInSchema = z.object({
  email: z.string().email('Enter a valid email.'),
  password: z.string().min(1, 'Enter your password.'),
});

export const signUpSchema = z.object({
  fullName: z.string().trim().min(2, 'Enter your name.'),
  email: z.string().email('Enter a valid email.'),
  password: z.string().min(8, 'Use at least 8 characters.'),
});

export const acceptInviteSchema = z.object({
  fullName: z.string().trim().min(2, 'Enter your name.'),
  password: z.string().min(8, 'Use at least 8 characters.'),
});

export type SignInInput = z.infer<typeof signInSchema>;
export type SignUpInput = z.infer<typeof signUpSchema>;
export type AcceptInviteInput = z.infer<typeof acceptInviteSchema>;
