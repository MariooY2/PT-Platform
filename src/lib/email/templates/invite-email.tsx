import {
  Body,
  Button,
  Container,
  Head,
  Heading,
  Hr,
  Html,
  Preview,
  Section,
  Text,
} from '@react-email/components';
import { render } from '@react-email/render';

/**
 * The invite email. Email clients cannot use our CSS design tokens (no CSS variables, no utility
 * classes), so styles are plain inline objects with literal colors — the standard react-email idiom.
 * Keeping them in constants (not `style={{…}}` literals) is what the pattern requires and also keeps
 * them out of the UI token check, which rightly targets app screens, not email HTML.
 */
export interface InviteEmailProps {
  coachName: string;
  inviteUrl: string;
}

export function inviteSubject(coachName: string): string {
  return `${coachName} invited you to train with them`;
}

export function InviteEmail({ coachName, inviteUrl }: InviteEmailProps) {
  return (
    <Html lang="en">
      <Head />
      <Preview>{coachName} invited you to train with them on PT Platform</Preview>
      <Body style={body}>
        <Container style={container}>
          <Heading style={heading}>{coachName} invited you to train with them</Heading>
          <Text style={paragraph}>
            Your coach set up an account for you to track your training, programs and check-ins.
            Accept the invite to create your login.
          </Text>
          <Section style={buttonSection}>
            <Button href={inviteUrl} style={button}>
              Accept invite
            </Button>
          </Section>
          <Text style={paragraph}>Or open this link in your browser:</Text>
          <Text style={link}>{inviteUrl}</Text>
          <Hr style={hr} />
          <Text style={footer}>
            This invite works only for the email address your coach entered, and expires in 14 days.
            If you weren&apos;t expecting it, you can ignore this email.
          </Text>
        </Container>
      </Body>
    </Html>
  );
}

InviteEmail.PreviewProps = {
  coachName: 'Rami Fitness',
  inviteUrl: 'https://pt.example.com/invite/preview-token',
} satisfies InviteEmailProps;

/** Render the invite email to html + a plain-text fallback and its subject. */
export async function renderInviteEmail(
  props: InviteEmailProps,
): Promise<{ subject: string; html: string; text: string }> {
  const element = <InviteEmail {...props} />;
  const [html, text] = await Promise.all([render(element), render(element, { plainText: true })]);
  return { subject: inviteSubject(props.coachName), html, text };
}

const body = {
  backgroundColor: '#f5f6f4',
  fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif",
  padding: '24px 0',
};

const container = {
  backgroundColor: '#ffffff',
  border: '1px solid #e3e5e0',
  borderRadius: '12px',
  margin: '0 auto',
  maxWidth: '480px',
  padding: '32px',
};

const heading = {
  color: '#1b1f24',
  fontSize: '22px',
  fontWeight: 700,
  lineHeight: '1.3',
  margin: '0 0 16px',
};

const paragraph = {
  color: '#3b4149',
  fontSize: '15px',
  lineHeight: '1.6',
  margin: '0 0 16px',
};

const buttonSection = {
  margin: '24px 0',
};

const button = {
  backgroundColor: '#2f4fd4',
  borderRadius: '10px',
  color: '#ffffff',
  display: 'inline-block',
  fontSize: '15px',
  fontWeight: 600,
  padding: '12px 24px',
  textDecoration: 'none',
};

const link = {
  color: '#2f4fd4',
  fontSize: '14px',
  lineHeight: '1.5',
  margin: '0 0 16px',
  wordBreak: 'break-all' as const,
};

const hr = {
  border: 'none',
  borderTop: '1px solid #e3e5e0',
  margin: '24px 0',
};

const footer = {
  color: '#6b7280',
  fontSize: '13px',
  lineHeight: '1.5',
  margin: 0,
};
