import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { Platform } from "@/utils/platform";
import prisma from "@/lib/prisma";
import { getServerSession } from "@/lib/auth/session";
import { clearAuthCookies } from "@/lib/auth/cookies";
import { validateCSRF } from "@/lib/auth/csrf";
import { validateBody } from "@/lib/api/validate";
import { UnauthenticatedError, ValidationError, handleApiError } from "@/lib/api/errors";
import { findUserById, updatePasswordHash } from "@/lib/auth/userLookup";

const changePasswordSchema = z.object({
  platform: z.nativeEnum(Platform),
  currentPassword: z.string().min(1),
  newPassword: z.string().min(6),
});

export async function POST(req: NextRequest) {
  try {
    if (!validateCSRF(req)) {
      return NextResponse.json({ success: false, error: "Cross-origin request blocked" }, { status: 403 });
    }

    const { platform, currentPassword, newPassword } = await validateBody(req, changePasswordSchema);

    const session = await getServerSession(platform);
    if (!session) throw new UnauthenticatedError();

    const user = await findUserById(platform, session.sub);
    if (!user?.passwordHash || !(await bcrypt.compare(currentPassword, user.passwordHash))) {
      throw new ValidationError({ currentPassword: "Incorrect current password" });
    }

    const newPasswordHash = await bcrypt.hash(newPassword, 12);
    await updatePasswordHash(platform, user.id, newPasswordHash);
    await prisma.refreshToken.updateMany({
      where: { userId: user.id, platform, revokedAt: null },
      data: { revokedAt: new Date() },
    });

    await clearAuthCookies(platform);
    return NextResponse.json({
      success: true,
      data: { message: "Password updated. Please log in again." },
    });
  } catch (err) {
    return handleApiError(err, { route: req.nextUrl.pathname, method: req.method });
  }
}
