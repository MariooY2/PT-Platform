import type { EmailMessage, EmailProvider, EmailResult } from './types';

/**
 * Logs the message instead of sending it (mirrors the mock payment provider, D-003). Used locally and
 * in every check run, so acceptance never depends on a real inbox or the Resend key.
 */
export class MockEmailProvider implements EmailProvider {
  readonly name = 'mock' as const;

  async send(message: EmailMessage): Promise<EmailResult> {
    console.info(
      `[email:mock] to=${message.to} subject=${JSON.stringify(message.subject)}\n${message.text}`,
    );
    return { ok: true, id: null };
  }
}
