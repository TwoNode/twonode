import { createTransport } from "nodemailer";
import prisma from "@/lib/prisma";
import { Platform } from "@/utils/platform";

/**
 * Per-platform branding for transactional auth emails (password reset,
 * email verification) — matches each product's own login/reset-password
 * page accent exactly, so the email and the page it links to feel like
 * one flow instead of a generic shared template.
 */
const PLATFORM_BRAND: Record<Platform, { name: string; accent: string; accentDark: string }> = {
  [Platform.SURFBOARD]: { name: "Surfboard", accent: "#0077B6", accentDark: "#023E8A" },
  [Platform.REVA]: { name: "REVA", accent: "#008cff", accentDark: "#032740" },
  [Platform.GBC]: { name: "GBC", accent: "#7C3AED", accentDark: "#5B21B6" },
  [Platform.SCRAM]: { name: "TwoNode", accent: "#0077B6", accentDark: "#023E8A" },
};

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
  /** Overrides the "From" display name shown in the recipient's inbox — the address itself is still EMAIL_USER, only the human-readable name changes (e.g. "REVA · TwoNode Technologies"). */
  fromName?: string;
}

export const sendMail = async ({
  to,
  subject,
  text = "",
  html = "",
  fromName,
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
      from: fromName ? `"${fromName}" <${process.env.EMAIL_USER}>` : process.env.EMAIL_USER,
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
  platform,
}: {
  to: string;
  firstName: string;
  resetUrl: string;
  isFirstTimeSetup: boolean;
  platform: Platform;
}) => {
  const brand = PLATFORM_BRAND[platform];
  const subject = isFirstTimeSetup
    ? `Set up your ${brand.name} password`
    : `Reset your ${brand.name} password`;
  const greeting = firstName ? `Hi ${firstName},` : "Hi,";
  const bodyLine = isFirstTimeSetup
    ? "Your account was originally set up with Google sign-in and doesn't have a password yet. Use the link below to set one — you'll then be able to sign in with either method."
    : "We received a request to reset your password. Use the link below to choose a new one.";
  const buttonLabel = isFirstTimeSetup ? "Set up password" : "Reset password";

  const text = `${greeting}\n\n${bodyLine}\n\n${resetUrl}\n\nThis link expires in 1 hour. If you didn't request this, you can safely ignore this email.\n\nTwoNode Technologies — https://www.twonodetechnologies.com`;
  const html = `
    <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; max-width: 480px; margin: 0 auto; color: #1a1a1a;">
      <div style="padding: 20px 0; border-bottom: 3px solid ${brand.accent};">
        <span style="font-size: 15px; font-weight: 700; color: ${brand.accentDark}; letter-spacing: .02em;">${brand.name}</span>
        <span style="font-size: 12px; color: #888; margin-left: 8px;">by TwoNode Technologies</span>
      </div>
      <div style="padding: 28px 0;">
        <p>${greeting}</p>
        <p>${bodyLine}</p>
        <p style="margin: 24px 0;">
          <a href="${resetUrl}" style="background:${brand.accent};color:#fff;padding:12px 24px;border-radius:8px;text-decoration:none;font-weight:600;display:inline-block;">${buttonLabel}</a>
        </p>
        <p style="color:#666;font-size:13px;">This link expires in 1 hour. If you didn't request this, you can safely ignore this email.</p>
      </div>
      <div style="padding: 20px 0; border-top: 1px solid #e5e5e5; color: #888; font-size: 12px;">
        <a href="https://www.twonodetechnologies.com" style="color: ${brand.accentDark}; text-decoration: none; font-weight: 600;">TwoNode Technologies</a>
        &nbsp;&middot;&nbsp;
        <a href="mailto:info@twonodetechnologies.com" style="color: #888; text-decoration: none;">info@twonodetechnologies.com</a>
      </div>
    </div>
  `;

  return sendMail({ to, subject, text, html, fromName: `${brand.name} · TwoNode Technologies` });
};

const escapeHtml = (value: string) =>
  value.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

/**
 * The invitation for a new admin/staff account (see lib/auth/adminInvitations.ts).
 * The link is the only credential — single-use, expires at `expiresAt`, and
 * only ever sent to the invited address, so following it also proves the
 * address is theirs.
 */
export const sendAdminInvitationEmail = async ({
  to,
  firstName,
  inviterName,
  roleLabel,
  acceptUrl,
  expiresAt,
  platform,
}: {
  to: string;
  firstName: string;
  inviterName: string;
  roleLabel: string;
  acceptUrl: string;
  expiresAt: Date;
  platform: Platform;
}) => {
  const brand = PLATFORM_BRAND[platform];
  const subject = `You've been invited to ${brand.name} as ${roleLabel}`;
  const greeting = firstName ? `Hi ${firstName},` : "Hi,";
  const bodyLine = `${inviterName} has invited you to join ${brand.name} as ${roleLabel}. Use the link below to set your password and activate your account.`;
  const expiry = expiresAt.toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" });

  const text = `${greeting}\n\n${bodyLine}\n\n${acceptUrl}\n\nThis link can be used once and expires on ${expiry}. If you weren't expecting this invitation, you can safely ignore this email.\n\nTwoNode Technologies — https://www.twonodetechnologies.com`;
  const html = `
    <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; max-width: 480px; margin: 0 auto; color: #1a1a1a;">
      <div style="padding: 20px 0; border-bottom: 3px solid ${brand.accent};">
        <span style="font-size: 15px; font-weight: 700; color: ${brand.accentDark}; letter-spacing: .02em;">${brand.name}</span>
        <span style="font-size: 12px; color: #888; margin-left: 8px;">by TwoNode Technologies</span>
      </div>
      <div style="padding: 28px 0;">
        <p>${escapeHtml(greeting)}</p>
        <p>${escapeHtml(bodyLine)}</p>
        <p style="margin: 24px 0;">
          <a href="${acceptUrl}" style="background:${brand.accent};color:#fff;padding:12px 24px;border-radius:8px;text-decoration:none;font-weight:600;display:inline-block;">Accept invitation</a>
        </p>
        <p style="color:#666;font-size:13px;">This link can be used once and expires on ${expiry}. If you weren't expecting this invitation, you can safely ignore this email.</p>
      </div>
      <div style="padding: 20px 0; border-top: 1px solid #e5e5e5; color: #888; font-size: 12px;">
        <a href="https://www.twonodetechnologies.com" style="color: ${brand.accentDark}; text-decoration: none; font-weight: 600;">TwoNode Technologies</a>
        &nbsp;&middot;&nbsp;
        <a href="mailto:info@twonodetechnologies.com" style="color: #888; text-decoration: none;">info@twonodetechnologies.com</a>
      </div>
    </div>
  `;

  return sendMail({ to, subject, text, html, fromName: `${brand.name} · TwoNode Technologies` });
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
  platform,
}: {
  to: string;
  firstName: string;
  verifyUrl: string;
  platform: Platform;
}) => {
  const brand = PLATFORM_BRAND[platform];
  const greeting = firstName ? `Hi ${firstName},` : "Hi,";
  const text = `${greeting}\n\nPlease confirm your email address for your ${brand.name} account by clicking the link below.\n\n${verifyUrl}\n\nThis link expires in 1 hour. If you didn't create this account, you can safely ignore this email.\n\nTwoNode Technologies — https://www.twonodetechnologies.com`;
  const html = `
    <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; max-width: 480px; margin: 0 auto; color: #1a1a1a;">
      <div style="padding: 20px 0; border-bottom: 3px solid ${brand.accent};">
        <span style="font-size: 15px; font-weight: 700; color: ${brand.accentDark}; letter-spacing: .02em;">${brand.name}</span>
        <span style="font-size: 12px; color: #888; margin-left: 8px;">by TwoNode Technologies</span>
      </div>
      <div style="padding: 28px 0;">
        <p>${greeting}</p>
        <p>Please confirm your email address for your ${brand.name} account by clicking the button below.</p>
        <p style="margin: 24px 0;">
          <a href="${verifyUrl}" style="background:${brand.accent};color:#fff;padding:12px 24px;border-radius:8px;text-decoration:none;font-weight:600;display:inline-block;">Verify email</a>
        </p>
        <p style="color:#666;font-size:13px;">This link expires in 1 hour. If you didn't create this account, you can safely ignore this email.</p>
      </div>
      <div style="padding: 20px 0; border-top: 1px solid #e5e5e5; color: #888; font-size: 12px;">
        <a href="https://www.twonodetechnologies.com" style="color: ${brand.accentDark}; text-decoration: none; font-weight: 600;">TwoNode Technologies</a>
        &nbsp;&middot;&nbsp;
        <a href="mailto:info@twonodetechnologies.com" style="color: #888; text-decoration: none;">info@twonodetechnologies.com</a>
      </div>
    </div>
  `;

  return sendMail({
    to,
    subject: `Verify your email address for ${brand.name}`,
    text,
    html,
    fromName: `${brand.name} · TwoNode Technologies`,
  });
};

/**
 * A download-gate code, requested fresh every time someone tries to
 * download a report or document — not a login/verification token, so it's
 * a short human-typed code rather than a link.
 */
export const sendDownloadOtpEmail = async ({
  to,
  firstName,
  code,
  target,
  platform,
}: {
  to: string;
  firstName: string;
  code: string;
  target: string;
  platform: Platform;
}) => {
  const brand = PLATFORM_BRAND[platform];
  const greeting = firstName ? `Hi ${firstName},` : "Hi,";
  const targetLabel = target === "report" ? "report" : "document";
  const text = `${greeting}\n\nYour ${brand.name} download code is: ${code}\n\nEnter this code to download your ${targetLabel}. This code expires in 10 minutes and can only be used once. If you didn't request this, you can safely ignore this email.\n\nTwoNode Technologies — https://www.twonodetechnologies.com`;
  const html = `
    <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; max-width: 480px; margin: 0 auto; color: #1a1a1a;">
      <div style="padding: 20px 0; border-bottom: 3px solid ${brand.accent};">
        <span style="font-size: 15px; font-weight: 700; color: ${brand.accentDark}; letter-spacing: .02em;">${brand.name}</span>
        <span style="font-size: 12px; color: #888; margin-left: 8px;">by TwoNode Technologies</span>
      </div>
      <div style="padding: 28px 0;">
        <p>${greeting}</p>
        <p>Use this code to download your ${targetLabel}:</p>
        <p style="margin: 24px 0; text-align: center;">
          <span style="background:#f4f4f5;color:${brand.accentDark};padding:14px 28px;border-radius:8px;font-weight:700;font-size:28px;letter-spacing:.15em;display:inline-block;">${code}</span>
        </p>
        <p style="color:#666;font-size:13px;">This code expires in 10 minutes and can only be used once. If you didn't request this, you can safely ignore this email.</p>
      </div>
      <div style="padding: 20px 0; border-top: 1px solid #e5e5e5; color: #888; font-size: 12px;">
        <a href="https://www.twonodetechnologies.com" style="color: ${brand.accentDark}; text-decoration: none; font-weight: 600;">TwoNode Technologies</a>
        &nbsp;&middot;&nbsp;
        <a href="mailto:info@twonodetechnologies.com" style="color: #888; text-decoration: none;">info@twonodetechnologies.com</a>
      </div>
    </div>
  `;

  return sendMail({
    to,
    subject: `Your ${brand.name} download code`,
    text,
    html,
    fromName: `${brand.name} · TwoNode Technologies`,
  });
};

/**
 * Send a Surfboard notification email. Shares the same account as every
 * other sender in this file (EMAIL_USER/EMAIL_PASS) — previously ran on a
 * separate NOTIF_EMAIL credential pair, consolidated once all outbound mail
 * moved onto one notifications@ mailbox.
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
    console.log("Surfboard email sent:", info.response);
    return { success: true, info };
  } catch (error) {
    console.error("Error sending Surfboard email:", error);
    return { success: false, error: "Failed to send Surfboard email" };
  }
};
