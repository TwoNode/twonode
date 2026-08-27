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
