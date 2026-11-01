import { MockEmailProvider } from './mock';
import { ResendEmailProvider } from './resend';
import type { EmailProvider } from './types';

export type { EmailMessage, EmailProvider, EmailResult } from './types';
export { MockEmailProvider } from './mock';
export { ResendEmailProvider } from './resend';
export { InviteEmail, inviteSubject, renderInviteEmail } from './templates/invite-email';
export type { InviteEmailProps } from './templates/invite-email';

/**
 * The active email provider. Mirrors getPaymentProvider() (docs/payments.md §8.1): `mock` is the
 * default so local dev and every check run log instead of sending; set EMAIL_PROVIDER=resend (with
 * RESEND_API_KEY + EMAIL_FROM) for the real send.
 */
export function getEmailProvider(): EmailProvider {
  if (process.env.EMAIL_PROVIDER === 'resend') return new ResendEmailProvider();
  return new MockEmailProvider();
}
