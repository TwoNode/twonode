import crypto from "crypto";
import prisma from "@/lib/prisma";
import { Platform } from "@/utils/platform";
import { sendPasswordResetEmail } from "@/utils/email";
import { sendWhatsAppMessage } from "@/lib/whatsapp";
import { getSiteUrl } from "@/lib/siteUrl";

const RESET_LINK_LIFETIME_MS = 60 * 60 * 1000;

function resetPath(platform: Platform): string {
  return platform === Platform.SURFBOARD
    ? "/surfboard/reset-password"
    : platform === Platform.REVA
      ? "/reva/reset-password"
      : "/gbc-restricted/reset-password";
}

/**
 * Issues a one-hour password reset link and sends it: a PasswordResetToken
 * (only the sha256 of the token is stored), the email, and a best-effort
 * WhatsApp message when the account has a phone. The link opens the product's
 * website reset page; the app has no reset screen of its own, so the website
 * request route and the mobile one both end here.
 *
 * The caller decides who gets a link (an active account, and for the app a
 * surveyor); this only builds and sends it. It never says whether it did:
 * routes answer the same way for a registered and an unregistered email.
 */
export async function issuePasswordReset(
  platform: Platform,
  user: {
    id: string;
    email: string;
    firstName: string | null;
    passwordHash: string | null;
    phone: string | null;
  }
): Promise<void> {
  const rawToken = crypto.randomBytes(32).toString("hex");
  const tokenHash = crypto.createHash("sha256").update(rawToken).digest("hex");

  await prisma.passwordResetToken.create({
    data: {
      userId: user.id,
      platform,
      tokenHash,
      expiresAt: new Date(Date.now() + RESET_LINK_LIFETIME_MS),
    },
  });

  const resetUrl = `${getSiteUrl()}${resetPath(platform)}?token=${rawToken}`;

  await sendPasswordResetEmail({
    to: user.email,
    firstName: user.firstName ?? "",
    resetUrl,
    isFirstTimeSetup: !user.passwordHash,
    platform,
  });

  // Best-effort second channel: never blocks or fails the request; silently a
  // no-op when the user has no phone on file, or no WhatsApp provider is
  // configured (see lib/whatsapp).
  if (user.phone) {
    sendWhatsAppMessage(
      user.phone,
      `Hi ${user.firstName || ""}, here's your TwoNode password reset link:\n${resetUrl}\n\nThis link expires in 1 hour. If you didn't request this, ignore this message.`
    ).catch(() => {});
  }

  // Local/dev convenience only: SMTP creds aren't always configured in dev,
  // and the raw token is never persisted anywhere (only its hash is), so this
  // is the one place it's ever visible after generation.
  if (process.env.NODE_ENV !== "production") {
    console.log(`[dev] password reset link for ${user.email}: ${resetUrl}`);
  }
}
