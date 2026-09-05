import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import { z } from "zod";
import { Platform } from "@/utils/platform";
import prisma from "@/lib/prisma";
import { validateCSRF } from "@/lib/auth/csrf";
import { validateBody } from "@/lib/api/validate";
import { ValidationError, handleApiError } from "@/lib/api/errors";
import { markEmailVerified } from "@/lib/auth/userLookup";

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
      return NextResponse.json({ success: false, error: "Cross-origin request blocked" }, { status: 403 });
    }

    const { platform, token } = await validateBody(req, verifySchema);
    const tokenHash = crypto.createHash("sha256").update(token).digest("hex");

    const verificationToken = await prisma.emailVerificationToken.findUnique({ where: { tokenHash } });

    if (
      !verificationToken ||
      verificationToken.platform !== platform ||
      verificationToken.usedAt ||
      verificationToken.expiresAt < new Date()
    ) {
      throw new ValidationError({ token: "This link is invalid or has expired. Request a new one." });
    }

    await prisma.emailVerificationToken.update({
      where: { id: verificationToken.id },
      data: { usedAt: new Date() },
    });

    await markEmailVerified(platform, verificationToken.userId);

    return NextResponse.json({
      success: true,
      data: { message: "Email verified." },
    });
  } catch (err) {
    return handleApiError(err, { route: req.nextUrl.pathname, method: req.method });
  }
}
