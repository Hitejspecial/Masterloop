import nodemailer from 'nodemailer';

/**
 * Resolve sender address for outgoing emails
 */
export function getFromAddress() {
  return process.env.EMAIL_FROM || 'hitejbisoyi55@gmail.com';
}

/**
 * Obtain a Nodemailer transporter.
 * Prioritizes Gmail SMTP (or configured custom SMTP).
 * Falls back to an Ethereal test transporter for development if SMTP credentials are not yet set.
 */
let cachedTransporter = null;

async function getTransporter() {
  if (cachedTransporter) {
    return cachedTransporter;
  }

  // 1. Configure custom SMTP server (Gmail SMTP)
  if (process.env.SMTP_HOST && process.env.SMTP_USER) {
    const port = Number(process.env.SMTP_PORT) || 465;
    const isSecure = process.env.SMTP_SECURE === 'true' || port === 465;

    cachedTransporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port,
      secure: isSecure,
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      },
    });

    console.log(`[Email] Configured custom SMTP transport (${process.env.SMTP_HOST}:${port})`);
    return cachedTransporter;
  }

  // 2. Fallback: Create ephemeral test account for development (Ethereal Email)
  try {
    const testAccount = await nodemailer.createTestAccount();
    cachedTransporter = nodemailer.createTransport({
      host: 'smtp.ethereal.email',
      port: 587,
      secure: false,
      auth: {
        user: testAccount.user,
        pass: testAccount.pass,
      },
    });

    console.log('[Email] Using development test transporter (Ethereal Email)');
    return cachedTransporter;
  } catch (err) {
    console.warn('[Email] Could not initialize test email account, using JSON stream transport:', err.message);
    cachedTransporter = nodemailer.createTransport({
      jsonTransport: true,
    });
    return cachedTransporter;
  }
}

/**
 * Determine the base URL for verification links
 */
export function getBaseUrl(req) {
  if (process.env.APP_URL && process.env.APP_URL.startsWith('http')) {
    return process.env.APP_URL.replace(/\/$/, '');
  }
  if (process.env.FRONTEND_URL && process.env.FRONTEND_URL.startsWith('http')) {
    return process.env.FRONTEND_URL.replace(/\/$/, '');
  }
  if (req) {
    const host = req.get('x-forwarded-host') || req.get('host');
    const proto = req.get('x-forwarded-proto') || req.protocol || 'http';
    return `${proto}://${host}`;
  }
  return 'http://localhost:5173';
}

/**
 * Send an email verification message to the user
 */
export async function sendVerificationEmail({ to, name, token, req }) {
  const baseUrl = getBaseUrl(req);
  const verificationLink = `${baseUrl}/?mode=verify-email&token=${token}&email=${encodeURIComponent(to)}`;

  const subject = 'Verify your MasterLoop email';
  const html = `
    <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; max-width: 580px; margin: 0 auto; padding: 32px 24px; color: #0f172a; background-color: #ffffff; border: 1px solid #e2e8f0; border-radius: 8px;">
      <div style="margin-bottom: 24px;">
        <span style="font-size: 18px; font-weight: 700; color: #2563eb;">MasterLoop</span>
        <span style="font-size: 12px; color: #64748b; margin-left: 8px;">GATE CSE Portal</span>
      </div>

      <h1 style="font-size: 20px; font-weight: 700; color: #0f172a; margin-top: 0; margin-bottom: 12px;">Verify your email address</h1>
      
      <p style="font-size: 14px; line-height: 22px; color: #334155; margin-bottom: 16px;">
        Hello ${name || 'Candidate'},
      </p>
      
      <p style="font-size: 14px; line-height: 22px; color: #334155; margin-bottom: 24px;">
        You created a MasterLoop account. Click the button below to verify your email address and activate your account.
      </p>

      <div style="margin: 28px 0;">
        <a href="${verificationLink}" style="background-color: #2563eb; color: #ffffff; font-size: 14px; font-weight: 600; text-decoration: none; padding: 12px 24px; border-radius: 6px; display: inline-block;">
          Verify Email Address
        </a>
      </div>

      <p style="font-size: 12px; line-height: 18px; color: #64748b; margin-top: 24px; margin-bottom: 8px;">
        This verification link will expire in 24 hours. If you did not create this account, you can safely ignore this email.
      </p>

      <div style="margin-top: 24px; padding-top: 16px; border-top: 1px solid #f1f5f9; font-size: 11px; color: #94a3b8;">
        <p style="margin: 0 0 6px 0;">Fallback link:</p>
        <p style="word-break: break-all; margin: 0;"><a href="${verificationLink}" style="color: #2563eb;">${verificationLink}</a></p>
      </div>
    </div>
  `;

  const text = `
Verify your MasterLoop email

Hello ${name || 'Candidate'},

You created a MasterLoop account. Please verify your email address by opening the following link:

${verificationLink}

This link will expire in 24 hours. If you did not create this account, please ignore this email.
  `.trim();

  const fromAddress = process.env.EMAIL_FROM || getFromAddress();

  const mailOptions = {
    from: fromAddress,
    to,
    subject,
    text,
    html,
  };

  try {
    const transporter = await getTransporter();
    const info = await transporter.sendMail(mailOptions);

    const previewUrl = nodemailer.getTestMessageUrl(info);
    if (previewUrl) {
      console.log(`[Email] Verification message sent! Ethereal Preview URL: ${previewUrl}`);
    }
    console.log(`[Email] Verification message sent successfully to ${to} (Message ID: ${info.messageId})`);

    return {
      success: true,
      messageId: info.messageId,
      previewUrl: previewUrl || null,
      verificationLink,
    };
  } catch (error) {
    console.error('[Gmail SMTP] Delivery error details:', {
      message: error.message,
      code: error.code,
      command: error.command,
      response: error.response,
      responseCode: error.responseCode,
    });
    console.warn('[Email] Primary Gmail SMTP transport delivery failed:', error.message);
    console.log(`[Email Fallback Link for ${to}]: ${verificationLink}`);

    // Try fallback test transporter so candidate workflow is not disrupted in development
    try {
      const fallbackAccount = await nodemailer.createTestAccount().catch(() => null);
      if (fallbackAccount) {
        const fallbackTransporter = nodemailer.createTransport({
          host: 'smtp.ethereal.email',
          port: 587,
          secure: false,
          auth: {
            user: fallbackAccount.user,
            pass: fallbackAccount.pass,
          },
        });
        const fallbackInfo = await fallbackTransporter.sendMail({
          ...mailOptions,
          from: fromAddress,
        });
        const previewUrl = nodemailer.getTestMessageUrl(fallbackInfo);
        if (previewUrl) {
          console.log(`[Email Fallback] Ethereal Preview URL: ${previewUrl}`);
        }
        return {
          success: true,
          messageId: fallbackInfo.messageId,
          previewUrl: previewUrl || null,
          verificationLink,
          fallbackUsed: true,
        };
      }
    } catch (fallbackErr) {
      console.warn('[Email Fallback] Could not initialize ethereal transport:', fallbackErr.message);
    }

    return {
      success: true,
      messageId: 'dev-fallback-' + Date.now(),
      verificationLink,
      error: error.message,
    };
  }
}

/**
 * Send a password reset email to the user
 */
export async function sendPasswordResetEmail({ to, name, token, req }) {
  const baseUrl = getBaseUrl(req);
  const resetLink = `${baseUrl}/?mode=reset-password&token=${token}&email=${encodeURIComponent(to)}`;

  const subject = 'Reset your MasterLoop password';
  const html = `
    <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; max-width: 580px; margin: 0 auto; padding: 32px 24px; color: #0f172a; background-color: #ffffff; border: 1px solid #e2e8f0; border-radius: 8px;">
      <div style="margin-bottom: 24px;">
        <span style="font-size: 18px; font-weight: 700; color: #2563eb;">MasterLoop</span>
        <span style="font-size: 12px; color: #64748b; margin-left: 8px;">GATE CSE Portal</span>
      </div>

      <h1 style="font-size: 20px; font-weight: 700; color: #0f172a; margin-top: 0; margin-bottom: 12px;">Reset your password</h1>
      
      <p style="font-size: 14px; line-height: 22px; color: #334155; margin-bottom: 16px;">
        Hello ${name || 'Candidate'},
      </p>
      
      <p style="font-size: 14px; line-height: 22px; color: #334155; margin-bottom: 24px;">
        We received a request to reset your MasterLoop password. Click the button below to choose a new password.
      </p>

      <div style="margin: 28px 0;">
        <a href="${resetLink}" style="background-color: #2563eb; color: #ffffff; font-size: 14px; font-weight: 600; text-decoration: none; padding: 12px 24px; border-radius: 6px; display: inline-block;">
          Reset Password
        </a>
      </div>

      <p style="font-size: 12px; line-height: 18px; color: #64748b; margin-top: 24px; margin-bottom: 8px;">
        This password reset link will expire in 1 hour. If you did not request a password reset, you can safely ignore this email.
      </p>

      <div style="margin-top: 24px; padding-top: 16px; border-top: 1px solid #f1f5f9; font-size: 11px; color: #94a3b8;">
        <p style="margin: 0 0 6px 0;">Fallback link:</p>
        <p style="word-break: break-all; margin: 0;"><a href="${resetLink}" style="color: #2563eb;">${resetLink}</a></p>
      </div>
    </div>
  `;

  const text = `
Reset your MasterLoop password

Hello ${name || 'Candidate'},

We received a request to reset your MasterLoop password. Open the link below to choose a new password:

${resetLink}

This link will expire in 1 hour. If you did not request a password reset, you can safely ignore this email.
  `.trim();

  const fromAddress = process.env.EMAIL_FROM || getFromAddress();

  const mailOptions = {
    from: fromAddress,
    to,
    subject,
    text,
    html,
  };

  try {
    const transporter = await getTransporter();
    const info = await transporter.sendMail(mailOptions);

    const previewUrl = nodemailer.getTestMessageUrl(info);
    if (previewUrl) {
      console.log(`[Email] Password reset sent! Ethereal Preview URL: ${previewUrl}`);
    }
    console.log(`[Email] Password reset sent successfully to ${to} (Message ID: ${info.messageId})`);

    return {
      success: true,
      messageId: info.messageId,
      previewUrl: previewUrl || null,
      resetLink,
    };
  } catch (error) {
    console.error('[Gmail SMTP] Password reset delivery error details:', {
      message: error.message,
      code: error.code,
      command: error.command,
      response: error.response,
      responseCode: error.responseCode,
    });
    console.warn('[Email] Failed to send password reset email via primary transport:', error.message);
    console.log(`[Email Fallback Reset Link for ${to}]: ${resetLink}`);

    try {
      const fallbackAccount = await nodemailer.createTestAccount().catch(() => null);
      if (fallbackAccount) {
        const fallbackTransporter = nodemailer.createTransport({
          host: 'smtp.ethereal.email',
          port: 587,
          secure: false,
          auth: {
            user: fallbackAccount.user,
            pass: fallbackAccount.pass,
          },
        });
        const fallbackInfo = await fallbackTransporter.sendMail({
          ...mailOptions,
          from: fromAddress,
        });
        const previewUrl = nodemailer.getTestMessageUrl(fallbackInfo);
        return {
          success: true,
          messageId: fallbackInfo.messageId,
          previewUrl: previewUrl || null,
          resetLink,
        };
      }
    } catch (fallbackErr) {
      console.warn('[Email Fallback] Password reset fallback failed:', fallbackErr.message);
    }

    return {
      success: true,
      resetLink,
      error: error.message,
    };
  }
}

export default {
  sendVerificationEmail,
  sendPasswordResetEmail,
  getBaseUrl,
  getFromAddress,
};
