import crypto from "crypto";
import { Platform } from "@/utils/platform";
import prisma from "@/lib/prisma";
import { sendVerificationEmail } from "@/utils/email";
import { getSiteUrl } from "@/lib/siteUrl";

function verifyPath(platform: Platform): string {
  switch (platform) {
    case Platform.SURFBOARD:
      return "/surfboard/verify-email";
    case Platform.REVA:
      return "/reva/verify-email";
    case Platform.GBC:
      return "/gbc-restricted/verify-email";
    default:
      throw new Error(`Unsupported platform: ${platform}`);
  }
}

/**
 * Issues a fresh EmailVerificationToken and emails the link. Shared by
 * registration (send-on-signup) and POST /api/v1/auth/resend-verification —
 * the only two callers, kept out of both route files rather than
 * duplicated between them.
 */
export async function issueAndSendVerificationEmail(
  platform: Platform,
  user: { id: string; email: string; firstName: string | null }
): Promise<void> {
  const rawToken = crypto.randomBytes(32).toString("hex");
  const tokenHash = crypto.createHash("sha256").update(rawToken).digest("hex");

  await prisma.emailVerificationToken.create({
    data: {
      userId: user.id,
      platform,
      tokenHash,
      expiresAt: new Date(Date.now() + 60 * 60 * 1000),
    },
  });

  const siteUrl = getSiteUrl();
  const verifyUrl = `${siteUrl}${verifyPath(platform)}?token=${rawToken}`;

  await sendVerificationEmail({
    to: user.email,
    firstName: user.firstName ?? "",
    verifyUrl,
    platform,
  });

  // Local/dev convenience only — SMTP creds aren't always configured in
  // dev, and the raw token is never persisted anywhere (only its hash is),
  // so this is the one place it's ever visible after generation.
  if (process.env.NODE_ENV !== "production") {
    console.log(`[dev] verification link for ${user.email}: ${verifyUrl}`);
  }
}
