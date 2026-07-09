import { Resend } from 'resend';
import { env } from '$env/dynamic/private';

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
  try {
    await getResend().emails.send({
      from: 'Wireloop <noreply@wire-loop.tech>',
      to,
      subject,
      html,
    });
  } catch (e) {
    console.error('Failed to send email:', e);
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
