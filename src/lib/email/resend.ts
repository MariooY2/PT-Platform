import { Resend } from 'resend';
import type { EmailMessage, EmailProvider, EmailResult } from './types';

/**
 * Real email via Resend. Server-only (reads RESEND_API_KEY + EMAIL_FROM, both secrets, inside send()).
 * Selected only when EMAIL_PROVIDER=resend; until a key and a verified domain are configured, the mock
 * provider stands in (docs/payments.md §8.4, D-003). The key is read at send time, never at import, so
 * a missing key can't break the build.
 */
export class ResendEmailProvider implements EmailProvider {
  readonly name = 'resend' as const;

  async send(message: EmailMessage): Promise<EmailResult> {
    const apiKey = process.env.RESEND_API_KEY;
    const from = process.env.EMAIL_FROM;
    if (!apiKey || !from) {
      return { ok: false, error: 'Email is not configured. Set RESEND_API_KEY and EMAIL_FROM.' };
    }

    try {
      const resend = new Resend(apiKey);
      const { data, error } = await resend.emails.send({
        from,
        to: message.to,
        subject: message.subject,
        html: message.html,
        text: message.text,
      });
      if (error) return { ok: false, error: error.message };
      return { ok: true, id: data?.id ?? null };
    } catch {
      return { ok: false, error: 'We couldn’t send the email. Try again.' };
    }
  }
}
