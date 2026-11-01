/**
 * Email provider interface. Mirrors the payments provider pattern (docs/payments.md §8.1, D-003):
 * a `mock` that logs stands in locally; the real `resend` send needs RESEND_API_KEY + EMAIL_FROM and
 * a verified domain (a human acceptance line). Server-only — never import a provider from the browser;
 * secrets are read only inside `src/lib/email/` (see scripts/check-architecture.mjs).
 */

/** A rendered message, ready to send. Templates render to both html and a plain-text fallback. */
export interface EmailMessage {
  to: string;
  subject: string;
  html: string;
  text: string;
}

export type EmailResult = { ok: true; id: string | null } | { ok: false; error: string };

export interface EmailProvider {
  readonly name: 'mock' | 'resend';
  send(message: EmailMessage): Promise<EmailResult>;
}
