import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { Platform } from "@/utils/platform";
import { issueSession } from "@/lib/auth/session";
import { validateCSRF } from "@/lib/auth/csrf";
import {
  checkRateLimit,
  recordAttempt,
  getClientIp,
} from "@/lib/auth/rateLimit";
import { validateBody } from "@/lib/api/validate";
import { handleApiError } from "@/lib/api/errors";
import { findUserByEmail } from "@/lib/auth/userLookup";

const loginSchema = z.object({
  platform: z.nativeEnum(Platform),
  email: z.string().email(),
  password: z.string().min(1),
  rememberMe: z.boolean().optional().default(true),
});

export async function POST(req: NextRequest) {
  try {
    if (!validateCSRF(req)) {
      return NextResponse.json(
        { success: false, error: "Cross-origin request blocked" },
        { status: 403 }
      );
    }

    const { platform, email, password, rememberMe } = await validateBody(
      req,
      loginSchema
    );
    // Lowercased so varying the casing of one address can't reset its limit.
    const identifier = `${getClientIp(req)}:${email.trim().toLowerCase()}`;

    if (!(await checkRateLimit(identifier))) {
      return NextResponse.json(
        { success: false, error: "Too many attempts. Try again later." },
        { status: 429 }
      );
    }

    const user = await findUserByEmail(platform, email);
    // No passwordHash means this account only ever signed in via Kinde — a
    // native-login attempt against it should fail exactly like a wrong
    // password would, not with a different (account-enumerating) message.
    const valid =
      user?.passwordHash && (await bcrypt.compare(password, user.passwordHash));

    if (!valid) {
      await recordAttempt(identifier, user?.id);
      return NextResponse.json(
        { success: false, error: "Invalid email or password" },
        { status: 401 }
      );
    }

    if (!user!.isActive) {
      return NextResponse.json(
        { success: false, error: "Account is inactive" },
        { status: 403 }
      );
    }

    const refreshDays = rememberMe ? 30 : 1;
    const refreshMaxAgeSeconds = refreshDays * 24 * 60 * 60;

    await issueSession(user!.id, user!.role, platform, refreshMaxAgeSeconds);

    return NextResponse.json({
      success: true,
      data: {
        id: user!.id,
        email: user!.email,
        role: user!.role.toLowerCase(),
      },
    });
  } catch (err) {
    return handleApiError(err, {
      route: req.nextUrl.pathname,
      method: req.method,
    });
  }
}
