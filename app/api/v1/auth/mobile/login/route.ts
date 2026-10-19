import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { Platform } from "@/utils/platform";
import { issueMobileSession, MOBILE_ALLOWED_ROLES } from "@/lib/auth/session";
import { consumeRateLimit } from "@/lib/auth/rateLimit";
import { validateBody } from "@/lib/api/validate";
import { handleApiError } from "@/lib/api/errors";
import { findUserByEmail } from "@/lib/auth/userLookup";

const loginSchema = z.object({
  platform: z.literal(Platform.SURFBOARD),
  email: z.string().email(),
  password: z.string().min(1),
  deviceId: z.string().min(8).max(128),
  deviceLabel: z.string().max(80).optional(),
  appVersion: z.string().max(32).optional(),
});

// The device id is chosen by the client, so a per-device limit alone is
// trivially bypassed by sending a new one each time. The per-email limit is
// the real brake on password guessing; the per-device limit stops a single
// misbehaving install. Neither is keyed on the IP address: many phones share
// one carrier-grade NAT address.
const DEVICE_LIMIT = { max: 5, windowMs: 5 * 60 * 1000 };
const EMAIL_LIMIT = { max: 20, windowMs: 15 * 60 * 1000 };

/**
 * POST /api/v1/auth/mobile/login — native-app sign-in. Same credential check
 * as /api/v1/auth/login, but the session comes back in the response body (the
 * app has no cookie jar) and no cookies are set. Authenticated by the
 * credentials in the body, so there is no CSRF check: nothing here reads
 * ambient browser credentials.
 */
export async function POST(req: NextRequest) {
  try {
    const { platform, email, password, deviceId, deviceLabel, appVersion } =
      await validateBody(req, loginSchema);
    const normalizedEmail = email.trim().toLowerCase();

    const allowed =
      (await consumeRateLimit(
        `mobile-login:${normalizedEmail}:${deviceId}`,
        undefined,
        DEVICE_LIMIT
      )) &&
      (await consumeRateLimit(
        `mobile-login-email:${normalizedEmail}`,
        undefined,
        EMAIL_LIMIT
      ));
    if (!allowed) {
      return NextResponse.json(
        { success: false, error: "Too many attempts. Try again later." },
        { status: 429 }
      );
    }

    const user = await findUserByEmail(platform, email);
    // Same rule as the web login: no passwordHash means a Kinde-only account,
    // and it must fail exactly like a wrong password (no account enumeration).
    const valid =
      user?.passwordHash && (await bcrypt.compare(password, user.passwordHash));
    if (!valid) {
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

    if (!MOBILE_ALLOWED_ROLES.includes(user!.role)) {
      return NextResponse.json(
        {
          success: false,
          error: "This account type can't sign in to the app",
          code: "ACCOUNT_TYPE_NOT_SUPPORTED",
        },
        { status: 403 }
      );
    }

    const session = await issueMobileSession(
      user!.id,
      user!.role,
      platform,
      { deviceId, deviceLabel, appVersion },
      { emailVerified: user!.emailVerified, createdAt: user!.createdAt }
    );

    return NextResponse.json(
      {
        success: true,
        data: {
          accessToken: session.accessToken,
          refreshToken: session.refreshToken,
          accessExpiresIn: session.accessExpiresIn,
          refreshExpiresAt: session.refreshExpiresAt.toISOString(),
          user: {
            id: user!.id,
            email: user!.email,
            firstName: user!.firstName,
            lastName: user!.lastName,
            role: user!.role.toLowerCase(),
            emailVerified: session.emailVerified ?? user!.emailVerified,
            mustVerifyNow: session.mustVerifyNow ?? false,
          },
        },
      },
      { headers: { "Cache-Control": "no-store" } }
    );
  } catch (err) {
    return handleApiError(err, {
      route: req.nextUrl.pathname,
      method: req.method,
    });
  }
}
