import { afterEach, describe, expect, it, vi } from 'vitest';
import { MockEmailProvider } from '@/lib/email/mock';
import { inviteSubject, renderInviteEmail } from '@/lib/email/templates/invite-email';

afterEach(() => {
  vi.restoreAllMocks();
});

describe('MockEmailProvider', () => {
  it('logs the message instead of sending and reports success', async () => {
    const info = vi.spyOn(console, 'info').mockImplementation(() => {});
    const provider = new MockEmailProvider();

    const result = await provider.send({
      to: 'client@example.com',
      subject: 'Rami invited you',
      html: '<p>hi</p>',
      text: 'hi — https://pt.example.com/invite/tok',
    });

    expect(result).toEqual({ ok: true, id: null });
    expect(info).toHaveBeenCalledTimes(1);
    const logged = info.mock.calls[0]!.join(' ');
    expect(logged).toContain('[email:mock]');
    expect(logged).toContain('client@example.com');
    // The link is in the body so a developer can follow the invite from the log.
    expect(logged).toContain('https://pt.example.com/invite/tok');
  });

  it('is named mock so acceptance never hits a real inbox', () => {
    expect(new MockEmailProvider().name).toBe('mock');
  });
});

describe('renderInviteEmail', () => {
  it('renders the react-email template to html, text and a subject', async () => {
    const inviteUrl = 'https://pt.example.com/invite/abc-123';
    const { subject, html, text } = await renderInviteEmail({
      coachName: 'Rami Fitness',
      inviteUrl,
    });

    expect(subject).toBe(inviteSubject('Rami Fitness'));
    expect(subject).toContain('Rami Fitness');

    expect(html).toContain('Accept invite');
    expect(html).toContain(inviteUrl);

    expect(text).toContain(inviteUrl);
    // The heading renders uppercased in the plain-text fallback (h1 → UPPER), so match loosely.
    expect(text.toLowerCase()).toContain('rami fitness');
  });
});
