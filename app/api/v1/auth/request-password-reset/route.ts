import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import { z } from "zod";
import { Platform } from "@/utils/platform";
import prisma from "@/lib/prisma";
import { validateCSRF } from "@/lib/auth/csrf";
import { checkRateLimit, recordAttempt, getClientIp } from "@/lib/auth/rateLimit";
import { validateBody } from "@/lib/api/validate";
import { handleApiError } from "@/lib/api/errors";
import { findUserByEmail } from "@/lib/auth/userLookup";
import { sendPasswordResetEmail } from "@/utils/email";
import { sendWhatsAppMessage } from "@/lib/whatsapp";

const requestSchema = z.object({
  platform: z.nativeEnum(Platform),
  email: z.string().email(),
});

const GENERIC_RESPONSE = NextResponse.json({
  success: true,
  data: { message: "If that email is registered, we've sent a link to it." },
});

/**
 * Always returns the same generic response whether or not the email is
 * registered — the login route (POST /api/v1/auth/login) deliberately does
 * the same for the identical reason: differentiating the response would let
 * anyone enumerate which emails have accounts (and, worse here, which ones
 * are Kinde-only) just by probing this endpoint. What CAN differ, safely,
 * is the emailed content itself — see sendPasswordResetEmail — since only
 * the inbox owner ever sees which variant was sent.
 */
export async function POST(req: NextRequest) {
  try {
    if (!validateCSRF(req)) {
      return NextResponse.json({ success: false, error: "Cross-origin request blocked" }, { status: 403 });
    }

    const { platform, email } = await validateBody(req, requestSchema);
    const clientIp = getClientIp(req);
    const identifier = `reset:${clientIp}:${email}`;

    if (!(await checkRateLimit(identifier))) {
      // Same generic response even when rate-limited — a distinct message
      // here would itself be a timing/enumeration signal.
      return GENERIC_RESPONSE;
    }
    await recordAttempt(identifier);

    const user = await findUserByEmail(platform, email);
    if (user && user.isActive) {
      const rawToken = crypto.randomBytes(32).toString("hex");
      const tokenHash = crypto.createHash("sha256").update(rawToken).digest("hex");

      await prisma.passwordResetToken.create({
        data: {
          userId: user.id,
          platform,
          tokenHash,
          expiresAt: new Date(Date.now() + 60 * 60 * 1000),
        },
      });

      const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://www.twonodetechnologies.com";
      const resetPath =
        platform === Platform.SURFBOARD
          ? "/surfboard/reset-password"
          : platform === Platform.REVA
            ? "/reva/reset-password"
            : "/gbc-restricted/reset-password";
      const resetUrl = `${siteUrl}${resetPath}?token=${rawToken}`;

      await sendPasswordResetEmail({
        to: user.email,
        firstName: user.firstName ?? "",
        resetUrl,
        isFirstTimeSetup: !user.passwordHash,
        platform,
      });

      // Best-effort second channel — never blocks or fails the request;
      // silently a no-op when the user has no phone on file, or no
      // WhatsApp provider is configured (see lib/whatsapp).
      if (user.phone) {
        sendWhatsAppMessage(
          user.phone,
          `Hi ${user.firstName || ""}, here's your TwoNode password reset link:\n${resetUrl}\n\nThis link expires in 1 hour. If you didn't request this, ignore this message.`
        ).catch(() => {});
      }

      // Local/dev convenience only — SMTP creds aren't always configured in
      // dev, and the raw token is never persisted anywhere (only its hash
      // is), so this is the one place it's ever visible after generation.
      if (process.env.NODE_ENV !== "production") {
        console.log(`[dev] password reset link for ${email}: ${resetUrl}`);
      }
    }

    return GENERIC_RESPONSE;
  } catch (err) {
    return handleApiError(err, { route: req.nextUrl.pathname, method: req.method });
  }
}
