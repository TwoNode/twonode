import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import bcrypt from "bcrypt";
import { z } from "zod";
import { Platform } from "@/utils/platform";
import prisma from "@/lib/prisma";
import { signAccessToken } from "@/lib/auth/jwt";
import { setAuthCookies } from "@/lib/auth/cookies";
import { validateCSRF } from "@/lib/auth/csrf";
import { checkRateLimit, recordAttempt, getClientIp } from "@/lib/auth/rateLimit";
import { validateBody } from "@/lib/api/validate";
import { ConflictError, handleApiError } from "@/lib/api/errors";
import { findUserByEmail, createNativeUser } from "@/lib/auth/userLookup";

const registerSchema = z.object({
  platform: z.nativeEnum(Platform),
  email: z.string().email(),
  password: z.string().min(6),
  firstName: z.string().min(1),
  lastName: z.string().min(1),
  // No `role` field, deliberately — see lib/auth/userLookup.ts's createNativeUser.
});

export async function POST(req: NextRequest) {
  try {
    if (!validateCSRF(req)) {
      return NextResponse.json({ success: false, error: "Cross-origin request blocked" }, { status: 403 });
    }

    const clientIp = getClientIp(req);
    if (!(await checkRateLimit(`register:${clientIp}`))) {
      return NextResponse.json(
        { success: false, error: "Too many registration attempts. Please try again later." },
        { status: 429 }
      );
    }

    const { platform, email, password, firstName, lastName } = await validateBody(req, registerSchema);

    const existing = await findUserByEmail(platform, email);
    if (existing) {
      await recordAttempt(`register:${clientIp}`);
      throw new ConflictError("Email address is already registered");
    }

    const passwordHash = await bcrypt.hash(password, 12);
    const user = await createNativeUser(platform, { email, passwordHash, firstName, lastName });

    const familyId = crypto.randomUUID();
    const rawRefreshToken = crypto.randomBytes(32).toString("hex");
    const tokenHash = crypto.createHash("sha256").update(rawRefreshToken).digest("hex");

    await prisma.refreshToken.create({
      data: {
        userId: user.id,
        platform,
        tokenHash,
        familyId,
        expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      },
    });

    const accessToken = await signAccessToken({ sub: user.id, role: user.role, platform });
    await setAuthCookies(platform, accessToken, rawRefreshToken);

    return NextResponse.json({
      success: true,
      data: { id: user.id, email: user.email, role: user.role.toLowerCase() },
    });
  } catch (err) {
    return handleApiError(err);
  }
}
