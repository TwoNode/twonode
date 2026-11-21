import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { Platform } from "@/utils/platform";
import { issueMobileSession, MOBILE_ALLOWED_ROLES } from "@/lib/auth/session";
import { consumeRateLimit } from "@/lib/auth/rateLimit";
import { validateBody } from "@/lib/api/validate";
import { ApiError, handleApiError, ValidationError } from "@/lib/api/errors";
import {
  assertMobileClientAllowed,
  assertMobileSignInEnabled,
} from "@/lib/api/mobileApp";
import {
  completePendingRegistration,
  PendingRegistrationRejectedError,
  type RegistrationRejection,
} from "@/lib/auth/pendingRegistration";
import {
  deviceHash,
  logMobileAuthEvent,
  mobileRequestContext,
  mobileTags,
} from "@/lib/observability/mobileTags";

const verifySchema = z.object({
  platform: z.literal(Platform.SURFBOARD),
  pendingRegistrationId: z.string().min(1).max(64),
  code: z.string().trim().length(6),
  // The password the registration was started with: the emailed code alone does not prove the
  // person at the keyboard chose it (see completePendingRegistration).
  password: z.string().min(1).max(72),
  deviceId: z.string().min(8).max(128),
  deviceLabel: z.string().max(80).optional(),
  appVersion: z.string().max(32).optional(),
});

// One code per way of being turned down, so the app words each case itself without matching on
// English. A wrong password is the app's own mistake (it holds the password), so it is a plain 400.
const REJECTION_CODES: Record<
  Exclude<RegistrationRejection, "WRONG_PASSWORD">,
  string
> = {
  MALFORMED: "VERIFICATION_CODE_INVALID",
  INCORRECT: "VERIFICATION_CODE_INCORRECT",
  EXPIRED: "VERIFICATION_CODE_EXPIRED",
  TOO_MANY_ATTEMPTS: "VERIFICATION_CODE_LOCKED",
};

const DEVICE_LIMIT = { max: 20, windowMs: 15 * 60 * 1000 };
const REGISTRATION_LIMIT = { max: 12, windowMs: 15 * 60 * 1000 };

/**
 * POST /api/v1/auth/mobile/register/verify: step 2 of creating an account from the app. Checks the
 * emailed code and the password, creates the verified account in one transaction (the same
 * completePendingRegistration the website uses, so its attempt cap, its 30-second retry window
 * and its consent record apply), and signs the person in on this phone: the answer is the same as
 * POST /auth/mobile/login.
 */
export async function POST(req: NextRequest) {
  try {
    await assertMobileClientAllowed(req);
    await assertMobileSignInEnabled();

    const {
      platform,
      pendingRegistrationId,
      code,
      password,
      deviceId,
      deviceLabel,
      appVersion,
    } = await validateBody(req, verifySchema);
    const tags = { ...mobileTags(req), deviceHash: deviceHash(deviceId) };

    const allowed =
      (await consumeRateLimit(
        `mobile-register-verify-device:${deviceId}`,
        undefined,
        DEVICE_LIMIT
      )) &&
      (await consumeRateLimit(
        `mobile-register-verify:${pendingRegistrationId}`,
        undefined,
        REGISTRATION_LIMIT
      ));
    if (!allowed) {
      logMobileAuthEvent("mobile.register", "rate_limited", tags);
      return NextResponse.json(
        {
          success: false,
          error: "Too many attempts. Try again later.",
          code: "RATE_LIMITED",
        },
        { status: 429 }
      );
    }

    let user;
    try {
      user = await completePendingRegistration(
        platform,
        pendingRegistrationId,
        code,
        password
      );
    } catch (err) {
      if (err instanceof PendingRegistrationRejectedError) {
        logMobileAuthEvent("mobile.register", err.reason.toLowerCase(), tags);
        if (err.reason === "WRONG_PASSWORD")
          throw new ValidationError(err.details);
        throw new ApiError(
          400,
          REJECTION_CODES[err.reason],
          (err.details as { code: string }).code
        );
      }
      throw err;
    }

    if (!MOBILE_ALLOWED_ROLES.includes(user.role)) {
      // A new account is always a surveyor; this is only a guard.
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
      user.id,
      user.role,
      platform,
      { deviceId, deviceLabel, appVersion },
      { emailVerified: user.emailVerified, createdAt: user.createdAt }
    );
    logMobileAuthEvent("mobile.register", "ok", { ...tags, userId: user.id });

    return NextResponse.json(
      {
        success: true,
        data: {
          accessToken: session.accessToken,
          refreshToken: session.refreshToken,
          accessExpiresIn: session.accessExpiresIn,
          refreshExpiresAt: session.refreshExpiresAt.toISOString(),
          user: {
            id: user.id,
            email: user.email,
            firstName: user.firstName,
            lastName: user.lastName,
            role: user.role.toLowerCase(),
            emailVerified: session.emailVerified ?? user.emailVerified,
            mustVerifyNow: session.mustVerifyNow ?? false,
          },
        },
      },
      { headers: { "Cache-Control": "no-store" } }
    );
  } catch (err) {
    return handleApiError(err, mobileRequestContext(req));
  }
}
