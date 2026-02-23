import nodemailer, { Transporter } from 'nodemailer';
import { env } from '../config/env';

let transporter: Transporter | null = null;

async function getTransporter(): Promise<Transporter> {
    if (transporter) return transporter;

    if (env.smtp.host && env.smtp.user && env.smtp.pass) {
        // Production SMTP
        transporter = nodemailer.createTransport({
            host: env.smtp.host,
            port: env.smtp.port,
            secure: env.smtp.port === 465,
            auth: { user: env.smtp.user, pass: env.smtp.pass },
        });
        console.log('📧  SMTP transporter ready:', env.smtp.host);
    } else {
        // Dev: Ethereal fake SMTP — auto-creates an account
        const testAccount = await nodemailer.createTestAccount();
        transporter = nodemailer.createTransport({
            host: 'smtp.ethereal.email',
            port: 587,
            secure: false,
            auth: { user: testAccount.user, pass: testAccount.pass },
        });
        console.log('📧  Ethereal test account created:', testAccount.user);
        console.log('📬  View sent emails at: https://ethereal.email');
    }

    return transporter;
}

// ── Email Templates ───────────────────────────────────────────────────────────

function baseTemplate(body: string): string {
    return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8"/>
  <meta name="viewport" content="width=device-width, initial-scale=1.0"/>
  <title>Your Genes — PharmaGuard</title>
</head>
<body style="margin:0;padding:0;background:#0f172a;font-family:Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="min-height:100vh;">
    <tr><td align="center" style="padding:40px 20px;">
      <table width="520" cellpadding="0" cellspacing="0" style="background:#1e293b;border-radius:20px;border:1px solid rgba(255,255,255,0.1);overflow:hidden;">
        <tr>
          <td style="background:linear-gradient(135deg,#3b82f6,#8b5cf6);padding:28px 40px;text-align:center;">
            <p style="color:#fff;font-size:28px;margin:0;">🧬 Your Genes</p>
            <p style="color:rgba(255,255,255,0.7);font-size:12px;margin:6px 0 0;letter-spacing:2px;text-transform:uppercase;">Pharmacogenomic Risk Prediction</p>
          </td>
        </tr>
        <tr><td style="padding:36px 40px;">${body}</td></tr>
        <tr>
          <td style="padding:20px 40px 28px;border-top:1px solid rgba(255,255,255,0.08);text-align:center;">
            <p style="color:#475569;font-size:11px;margin:0;">HIPAA Compliant · 256-bit SSL · Your genetic data is encrypted and secure</p>
            <p style="color:#334155;font-size:10px;margin:8px 0 0;">© 2026 Your Genes / PharmaGuard · RIFT 2026</p>
          </td>
        </tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;
}

// ── Send Functions ────────────────────────────────────────────────────────────

export async function sendVerificationEmail(to: string, name: string, token: string): Promise<void> {
    const verifyUrl = `${env.clientUrl}/verify-email?token=${token}`;

    const body = `
    <h2 style="color:#fff;font-size:22px;margin:0 0 12px;">Verify your email</h2>
    <p style="color:#94a3b8;font-size:14px;line-height:1.7;margin:0 0 24px;">
      Hi ${name}, welcome to PharmaGuard. Click the button below to verify your email address and activate your Patient Portal account.
    </p>
    <div style="text-align:center;margin:28px 0;">
      <a href="${verifyUrl}" style="display:inline-block;padding:14px 32px;background:linear-gradient(135deg,#3b82f6,#8b5cf6);color:#fff;font-weight:700;font-size:15px;text-decoration:none;border-radius:12px;box-shadow:0 8px 25px rgba(59,130,246,0.35);">
        Verify Email Address
      </a>
    </div>
    <p style="color:#475569;font-size:12px;text-align:center;">
      Or paste this link in your browser:<br/>
      <span style="color:#3b82f6;word-break:break-all;">${verifyUrl}</span>
    </p>
    <p style="color:#334155;font-size:11px;margin:20px 0 0;padding-top:20px;border-top:1px solid rgba(255,255,255,0.06);">
      This link expires in 24 hours. If you didn't create this account, please ignore this email.
    </p>`;

    const transport = await getTransporter();
    const info = await transport.sendMail({
        from: `"PharmaGuard · Your Genes" <${env.emailFrom}>`,
        to,
        subject: '🧬 Verify your PharmaGuard account',
        html: baseTemplate(body),
    });

    if (!env.isProd) {
        console.log('📬  Verification email preview URL:', nodemailer.getTestMessageUrl(info));
    }
}

export async function sendPasswordResetEmail(to: string, name: string, token: string): Promise<void> {
    const resetUrl = `${env.clientUrl}/reset-password?token=${token}`;

    const body = `
    <h2 style="color:#fff;font-size:22px;margin:0 0 12px;">Reset your password</h2>
    <p style="color:#94a3b8;font-size:14px;line-height:1.7;margin:0 0 24px;">
      Hi ${name}, we received a request to reset the password for your PharmaGuard Patient Portal account.
    </p>
    <div style="text-align:center;margin:28px 0;">
      <a href="${resetUrl}" style="display:inline-block;padding:14px 32px;background:linear-gradient(135deg,#ef4444,#dc2626);color:#fff;font-weight:700;font-size:15px;text-decoration:none;border-radius:12px;box-shadow:0 8px 25px rgba(220,38,38,0.35);">
        Reset Password
      </a>
    </div>
    <p style="color:#475569;font-size:12px;text-align:center;">
      Or paste this link in your browser:<br/>
      <span style="color:#ef4444;word-break:break-all;">${resetUrl}</span>
    </p>
    <p style="color:#334155;font-size:11px;margin:20px 0 0;padding-top:20px;border-top:1px solid rgba(255,255,255,0.06);">
      This link expires in 1 hour. If you didn't request a password reset, your account is safe — please ignore this email.
    </p>`;

    const transport = await getTransporter();
    const info = await transport.sendMail({
        from: `"PharmaGuard · Your Genes" <${env.emailFrom}>`,
        to,
        subject: '🔐 Reset your PharmaGuard password',
        html: baseTemplate(body),
    });

    if (!env.isProd) {
        console.log('📬  Password reset email preview URL:', nodemailer.getTestMessageUrl(info));
    }
}
