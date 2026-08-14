import { Resend } from 'resend';
import { env } from '$env/dynamic/private';
import * as Sentry from '@sentry/sveltekit';

let _resend: Resend | null = null;

function getResend(): Resend {
  if (!_resend) {
    _resend = new Resend(env.RESEND_API_KEY);
  }
  return _resend;
}

export async function sendEmail({
  to,
  subject,
  html,
}: {
  to: string;
  subject: string;
  html: string;
}) {
  console.warn('[EMAIL] sendEmail entry', { to, subject });
  try {
    await getResend().emails.send({
      from: 'Wireloop <noreply@wire-loop.tech>',
      to,
      subject,
      html,
    });
    console.warn('[EMAIL] sendEmail done', { to, subject });
  } catch (e) {
    Sentry.captureException(e, { tags: { service: 'email', action: 'send' }, extra: { to, subject } });
    console.warn('[EMAIL] sendEmail error', { to, subject, error: String(e) });
  }
}

export async function sendVerificationEmail({
  email,
  url,
}: {
  email: string;
  url: string;
}) {
  await sendEmail({
    to: email,
    subject: 'Verify your Wireloop email address',
    html: `
      <div style="font-family: sans-serif; max-width: 480px; margin: 0 auto; padding: 32px 0;">
        <h2 style="margin-bottom: 16px;">Verify your email address</h2>
        <p style="margin-bottom: 24px; color: #555;">
          Thanks for signing up for Wireloop. Click the link below to verify your email address:
        </p>
        <a
          href="${url}"
          style="display: inline-block; padding: 12px 24px; background: #2563eb; color: #fff; text-decoration: none; border-radius: 6px; font-weight: 500;"
        >
          Verify Email Address
        </a>
        <p style="margin-top: 24px; color: #888; font-size: 13px;">
          If you didn't create this account, you can safely ignore this email.
        </p>
      </div>
    `,
  });
}

export async function sendInviteEmail(
  email: string,
  kind: 'org' | 'project',
  targetName: string,
  inviterName: string,
) {
  const what = kind === 'org' ? 'organization' : 'project';
  await sendEmail({
    to: email,
    subject: `${inviterName} invited you to a Wireloop ${what}`,
    html: `
      <div style="font-family: sans-serif; max-width: 480px; margin: 0 auto; padding: 32px 0;">
        <h2 style="margin-bottom: 16px;">You've been invited</h2>
        <p style="margin-bottom: 24px; color: #555;">
          <strong>${inviterName}</strong> invited you to collaborate on
          "<strong>${targetName}</strong>" in Wireloop.
        </p>
        <a
          href="https://wire-loop.tech/signup"
          style="display: inline-block; padding: 12px 24px; background: #2563eb; color: #fff; text-decoration: none; border-radius: 6px; font-weight: 500;"
        >
          Join Wireloop
        </a>
        <p style="margin-top: 24px; color: #888; font-size: 13px;">
          If you didn't expect this invitation, you can safely ignore this email.
        </p>
      </div>
    `,
  });
}

export async function sendPasswordResetEmail({
  email,
  url,
}: {
  email: string;
  url: string;
}) {
  await sendEmail({
    to: email,
    subject: 'Reset your Wireloop password',
    html: `
      <div style="font-family: sans-serif; max-width: 480px; margin: 0 auto; padding: 32px 0;">
        <h2 style="margin-bottom: 16px;">Reset your password</h2>
        <p style="margin-bottom: 24px; color: #555;">
          Click the link below to reset your Wireloop password:
        </p>
        <a
          href="${url}"
          style="display: inline-block; padding: 12px 24px; background: #2563eb; color: #fff; text-decoration: none; border-radius: 6px; font-weight: 500;"
        >
          Reset Password
        </a>
        <p style="margin-top: 24px; color: #888; font-size: 13px;">
          If you didn't request this, you can safely ignore this email.
        </p>
      </div>
    `,
  });
}
