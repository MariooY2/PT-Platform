'use server';

import { redirect } from 'next/navigation';
import { z } from 'zod';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { slugSchema } from '@/features/auth/schemas';

const onboardingSchema = z.object({
  businessName: z.string().trim().min(1, 'Enter your business name.'),
  slug: slugSchema,
  bio: z
    .string()
    .trim()
    .max(500, 'Keep your bio under 500 characters.')
    .optional()
    .or(z.literal('')),
  brandColor: z
    .string()
    .regex(/^#[0-9a-fA-F]{6}$/, 'Use a hex colour like #1F4FD1.')
    .optional()
    .or(z.literal('')),
  currency: z.enum(['USD', 'LBP']),
  payoutPhone: z.string().trim().max(40).optional().or(z.literal('')),
});

export type OnboardingState = { error?: string } | undefined;

export async function completeOnboardingAction(
  _prev: OnboardingState,
  formData: FormData,
): Promise<OnboardingState> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const parsed = onboardingSchema.safeParse({
    businessName: formData.get('businessName'),
    slug: formData.get('slug'),
    bio: formData.get('bio'),
    brandColor: formData.get('brandColor'),
    currency: formData.get('currency'),
    payoutPhone: formData.get('payoutPhone'),
  });
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? 'Check the form.' };
  const v = parsed.data;

  // Creating the trainers row is a service-role transition (authenticated has no INSERT, D-014).
  const admin = createAdminClient();
  const { error } = await admin.from('trainers').upsert({
    id: user.id,
    slug: v.slug,
    business_name: v.businessName,
    bio: v.bio || null,
    brand_color: v.brandColor || null,
    default_currency: v.currency,
    payout_whish_phone: v.payoutPhone || null,
    storefront_published: false,
  });
  if (error) {
    if (error.code === '23505') return { error: 'That storefront address is taken. Try another.' };
    return { error: 'We couldn’t save your details. Try again.' };
  }

  redirect('/coach');
}
