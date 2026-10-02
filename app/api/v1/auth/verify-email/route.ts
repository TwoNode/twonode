import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import { z } from "zod";
import { Platform } from "@/utils/platform";
import prisma from "@/lib/prisma";
import { validateCSRF } from "@/lib/auth/csrf";
import { validateBody } from "@/lib/api/validate";
import { ValidationError, handleApiError } from "@/lib/api/errors";
import { markEmailVerified, findUserById } from "@/lib/auth/userLookup";
import { getServerSession, issueSession } from "@/lib/auth/session";

const verifySchema = z.object({
  platform: z.nativeEnum(Platform),
  token: z.string().min(1),
});

/**
 * Unlike reset-password, this doesn't revoke refresh tokens or burn other
 * outstanding tokens for the user — confirming an address isn't a
 * credential change, so an existing session (or a second verification
 * email someone already requested) staying valid is fine.
 */
export async function POST(req: NextRequest) {
  try {
    if (!validateCSRF(req)) {
      return NextResponse.json(
        { success: false, error: "Cross-origin request blocked" },
        { status: 403 }
      );
    }

    const { platform, token } = await validateBody(req, verifySchema);
    const tokenHash = crypto.createHash("sha256").update(token).digest("hex");

    const verificationToken = await prisma.emailVerificationToken.findUnique({
      where: { tokenHash },
    });

    if (
      !verificationToken ||
      verificationToken.platform !== platform ||
      verificationToken.usedAt ||
      verificationToken.expiresAt < new Date()
    ) {
      throw new ValidationError({
        token: "This link is invalid or has expired. Request a new one.",
      });
    }

    await prisma.emailVerificationToken.update({
      where: { id: verificationToken.id },
      data: { usedAt: new Date() },
    });

    await markEmailVerified(platform, verificationToken.userId, "LINK");

    // If the device making this request already holds a session for this
    // same user (the common case: verifying in a second tab on the same
    // browser), reissue it so emailVerified/mustVerifyNow reflect the new
    // state immediately — otherwise the dashboard keeps bouncing them back
    // to the gate on the stale JWT until the access token naturally expires.
    const session = await getServerSession(platform);
    if (session?.sub === verificationToken.userId) {
      const user = await findUserById(platform, verificationToken.userId);
      if (user) {
        await issueSession(
          user.id,
          user.role,
          platform,
          30 * 24 * 60 * 60,
          user
        );
      }
    }

    return NextResponse.json({
      success: true,
      data: { message: "Email verified." },
    });
  } catch (err) {
    return handleApiError(err, {
      route: req.nextUrl.pathname,
      method: req.method,
    });
  }
}
