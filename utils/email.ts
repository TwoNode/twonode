import { createTransport } from "nodemailer";
import prisma from "@/lib/prisma";

export const sendEmailToAdmin = async ({
  to,
  subject,
  text,
  html,
}: {
  to: string;
  subject: string;
  text: string;
  html: string;
}) => {
  try {
    const transporter = createTransport({
      service: "Zoho",
      auth: {
        user: process?.env?.EMAIL_USER,
        pass: process?.env?.EMAIL_PASS,
      },
    });

    const mailOptions = {
      from: process?.env?.EMAIL_USER,
      to,
      subject,
      text,
      html,
    };

    const info = await transporter.sendMail(mailOptions);
    console.log("Email sent to admin: ", info.response);

    return { success: true, info };
  } catch (error) {
    console.error("Error sending email to admin:", error);
    return { success: false, error: "Failed to send email to admin" };
  }
};

interface EmailOptions {
  to: string;
  subject: string;
  text?: string;
  html?: string;
}

export const sendMail = async ({
  to,
  subject,
  text = "",
  html = "",
}: EmailOptions) => {
  try {
    const transporter = createTransport({
      service: "Zoho",
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS,
      },
    });

    const mailOptions = {
      from: process.env.EMAIL_USER,
      to,
      subject,
      text,
      html,
    };

    const info = await transporter.sendMail(mailOptions);
    console.log("Email sent:", info.response);
    return { success: true, info };
  } catch (error) {
    console.error("Error sending email:", error);
    return { success: false, error: "Failed to send email" };
  }
};

/**
 * Moved from reva-restricted/actions/adminDbActions.ts (resolved Phase 3
 * decision — its own `sendMail` was a byte-for-byte duplicate of the one
 * above; these two bulk-recipient helpers were the only genuinely new
 * behavior, so they moved here instead of the duplicate coming along).
 * REVA-specific (query prisma.revaUser directly) the same way
 * sendNotificationMail below is Surfboard-specific — this file holds the
 * shared sendMail plus each product's own recipient-resolution helpers.
 */
async function getAllRevaAdminEmails(): Promise<string[]> {
  const admins = await prisma.revaUser.findMany({
    where: { role: { in: ["ADMIN", "SUPERADMIN"] }, is_active: true },
    select: { email: true },
  });
  return admins.map((u) => u.email);
}

async function getAllRevaSuperAdminEmails(): Promise<string[]> {
  const superadmins = await prisma.revaUser.findMany({
    where: { role: "SUPERADMIN", is_active: true },
    select: { email: true },
  });
  return superadmins.map((u) => u.email);
}

export const sendEmailToAllAdmins = async ({
  subject,
  text,
  html,
}: {
  subject: string;
  text: string;
  html: string;
}) => {
  const adminEmails = await getAllRevaAdminEmails();
  if (adminEmails.length === 0) {
    return { success: false, error: "No admin emails found" };
  }
  const result = await sendMail({ to: adminEmails.join(","), subject, text, html });
  return { success: result.success, data: result, recipientCount: adminEmails.length };
};

export const sendEmailToAllSuperAdmins = async ({
  subject,
  text,
  html,
}: {
  subject: string;
  text: string;
  html: string;
}) => {
  const superadminEmails = await getAllRevaSuperAdminEmails();
  if (superadminEmails.length === 0) {
    return { success: false, error: "No superadmin emails found" };
  }
  const result = await sendMail({ to: superadminEmails.join(","), subject, text, html });
  return { success: result.success, data: result, recipientCount: superadminEmails.length };
};

/**
 * One template, two copies. `isFirstTimeSetup` is decided by the caller
 * (POST /api/v1/auth/request-password-reset) from whether the account had a
 * passwordHash *before* this token was issued — a Kinde-only account gets
 * "set up a password" framing instead of "reset your password" wording, so
 * they don't read it as a warning that someone's trying to break in. Same
 * link, same token, same expiry either way; only the words differ, and only
 * the account owner (who receives the email) ever sees which variant was
 * sent — the API response that triggered it stays identical for both to
 * avoid revealing account state to anyone probing by email address.
 */
export const sendPasswordResetEmail = async ({
  to,
  firstName,
  resetUrl,
  isFirstTimeSetup,
}: {
  to: string;
  firstName: string;
  resetUrl: string;
  isFirstTimeSetup: boolean;
}) => {
  const subject = isFirstTimeSetup
    ? "Set up your password"
    : "Reset your password";
  const greeting = firstName ? `Hi ${firstName},` : "Hi,";
  const bodyLine = isFirstTimeSetup
    ? "Your account was originally set up with Google sign-in and doesn't have a password yet. Use the link below to set one — you'll then be able to sign in with either method."
    : "We received a request to reset your password. Use the link below to choose a new one.";
  const buttonLabel = isFirstTimeSetup ? "Set up password" : "Reset password";

  const text = `${greeting}\n\n${bodyLine}\n\n${resetUrl}\n\nThis link expires in 1 hour. If you didn't request this, you can safely ignore this email.`;
  const html = `
    <div style="font-family: -apple-system, sans-serif; max-width: 480px; margin: 0 auto;">
      <p>${greeting}</p>
      <p>${bodyLine}</p>
      <p style="margin: 24px 0;">
        <a href="${resetUrl}" style="background:#0077B6;color:#fff;padding:12px 24px;border-radius:8px;text-decoration:none;font-weight:600;display:inline-block;">${buttonLabel}</a>
      </p>
      <p style="color:#666;font-size:13px;">This link expires in 1 hour. If you didn't request this, you can safely ignore this email.</p>
    </div>
  `;

  return sendMail({ to, subject, text, html });
};

/**
 * POST /api/v1/auth/verify-email's counterpart. Sent on native registration
 * and from POST /api/v1/auth/resend-verification — same token shape as the
 * password-reset flow (EmailVerificationToken, hashed, 1hr expiry,
 * single-use) but a separate table/link, since a leaked token here only
 * lets someone mark an address "verified," not take over the account.
 */
export const sendVerificationEmail = async ({
  to,
  firstName,
  verifyUrl,
}: {
  to: string;
  firstName: string;
  verifyUrl: string;
}) => {
  const greeting = firstName ? `Hi ${firstName},` : "Hi,";
  const text = `${greeting}\n\nPlease confirm your email address by clicking the link below.\n\n${verifyUrl}\n\nThis link expires in 1 hour. If you didn't create this account, you can safely ignore this email.`;
  const html = `
    <div style="font-family: -apple-system, sans-serif; max-width: 480px; margin: 0 auto;">
      <p>${greeting}</p>
      <p>Please confirm your email address by clicking the button below.</p>
      <p style="margin: 24px 0;">
        <a href="${verifyUrl}" style="background:#0077B6;color:#fff;padding:12px 24px;border-radius:8px;text-decoration:none;font-weight:600;display:inline-block;">Verify email</a>
      </p>
      <p style="color:#666;font-size:13px;">This link expires in 1 hour. If you didn't create this account, you can safely ignore this email.</p>
    </div>
  `;

  return sendMail({ to, subject: "Verify your email address", text, html });
};

/**
 * Send email using Surfboard notification credentials (NOTIF_EMAIL)
 */
export const sendNotificationMail = async ({
  to,
  subject,
  text = "",
  html = "",
}: EmailOptions) => {
  try {
    const transporter = createTransport({
      service: "Zoho",
      auth: {
        user: process.env.NOTIF_EMAIL,
        pass: process.env.NOTIF_EMAIL_PASS,
      },
    });

    const mailOptions = {
      from: process.env.NOTIF_EMAIL,
      to,
      subject,
      text,
      html,
    };

    const info = await transporter.sendMail(mailOptions);
    console.log("Surfboard email sent:", info.response);
    return { success: true, info };
  } catch (error) {
    console.error("Error sending Surfboard email:", error);
    return { success: false, error: "Failed to send Surfboard email" };
  }
};
