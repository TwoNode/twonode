import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import bcrypt from "bcrypt";
import { z } from "zod";
import { Platform } from "@/utils/platform";
import prisma from "@/lib/prisma";
import { validateCSRF } from "@/lib/auth/csrf";
import { validateBody } from "@/lib/api/validate";
import { ValidationError, handleApiError } from "@/lib/api/errors";
import { updatePasswordHash } from "@/lib/auth/userLookup";

const resetSchema = z.object({
  platform: z.nativeEnum(Platform),
  token: z.string().min(1),
  newPassword: z.string().min(6),
});

export async function POST(req: NextRequest) {
  try {
    if (!validateCSRF(req)) {
      return NextResponse.json({ success: false, error: "Cross-origin request blocked" }, { status: 403 });
    }

    const { platform, token, newPassword } = await validateBody(req, resetSchema);
    const tokenHash = crypto.createHash("sha256").update(token).digest("hex");

    const resetToken = await prisma.passwordResetToken.findUnique({ where: { tokenHash } });

    if (
      !resetToken ||
      resetToken.platform !== platform ||
      resetToken.usedAt ||
      resetToken.expiresAt < new Date()
    ) {
      throw new ValidationError({ token: "This link is invalid or has expired. Request a new one." });
    }

    const newPasswordHash = await bcrypt.hash(newPassword, 12);

    await prisma.$transaction([
      prisma.passwordResetToken.update({
        where: { id: resetToken.id },
        data: { usedAt: new Date() },
      }),
      // Every other outstanding reset token for this user+platform is now
      // moot — burn them too, same "single use" guarantee change-password
      // gets by revoking refresh tokens below.
      prisma.passwordResetToken.updateMany({
        where: { userId: resetToken.userId, platform, usedAt: null, id: { not: resetToken.id } },
        data: { usedAt: new Date() },
      }),
      prisma.refreshToken.updateMany({
        where: { userId: resetToken.userId, platform, revokedAt: null },
        data: { revokedAt: new Date() },
      }),
    ]);

    await updatePasswordHash(platform, resetToken.userId, newPasswordHash);

    return NextResponse.json({
      success: true,
      data: { message: "Password updated. You can now sign in." },
    });
  } catch (err) {
    return handleApiError(err, { route: req.nextUrl.pathname, method: req.method });
  }
}
