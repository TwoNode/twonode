import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { Platform } from "@/utils/platform";
import { MOBILE_ALLOWED_ROLES } from "@/lib/auth/session";
import { consumeRateLimit } from "@/lib/auth/rateLimit";
import { validateBody } from "@/lib/api/validate";
import { handleApiError } from "@/lib/api/errors";
import { findUserByEmail } from "@/lib/auth/userLookup";
import { issuePasswordReset } from "@/lib/auth/passwordReset";

const requestSchema = z.object({
  platform: z.literal(Platform.SURFBOARD),
  email: z.string().email(),
  deviceId: z.string().min(8).max(128),
});

// As for sign-in: the device id is chosen by the client, so the per-device
// limit only stops one misbehaving install; the per-email limit is the real
// brake, and it also caps how many emails anyone can make us send to a
// stranger's inbox. Neither uses the IP address (carrier NAT).
const DEVICE_LIMIT = { max: 3, windowMs: 15 * 60 * 1000 };
const EMAIL_LIMIT = { max: 5, windowMs: 60 * 60 * 1000 };

// A function, not a shared NextResponse: a response body can be sent once.
function genericResponse() {
  return NextResponse.json(
    {
      success: true,
      data: {
        message: "If that email is registered, we've sent a link to it.",
      },
    },
    { headers: { "Cache-Control": "no-store" } }
  );
}

/**
 * POST /api/v1/auth/mobile/request-password-reset: "Forgot password" in the
 * app. The website's route (POST /api/v1/auth/request-password-reset) turns
 * a native call away, since the app sends no Origin or Referer, so this is
 * its twin: no CSRF check (nothing here reads ambient browser credentials),
 * keyed on email and device instead of the address. The link in the email
 * opens the website's reset page; the app has no reset screen.
 *
 * Answers the same whether the email is registered, is an account the app
 * cannot sign in (only surveyors can), or the caller was rate limited: any
 * difference would tell a stranger which emails have accounts.
 */
export async function POST(req: NextRequest) {
  try {
    const { platform, email, deviceId } = await validateBody(
      req,
      requestSchema
    );
    const normalizedEmail = email.trim().toLowerCase();

    const allowed =
      (await consumeRateLimit(
        `mobile-reset:${normalizedEmail}:${deviceId}`,
        undefined,
        DEVICE_LIMIT
      )) &&
      (await consumeRateLimit(
        `mobile-reset-email:${normalizedEmail}`,
        undefined,
        EMAIL_LIMIT
      ));
    if (!allowed) return genericResponse();

    const user = await findUserByEmail(platform, email);
    if (user && user.isActive && MOBILE_ALLOWED_ROLES.includes(user.role)) {
      await issuePasswordReset(platform, user);
    }

    return genericResponse();
  } catch (err) {
    return handleApiError(err, {
      route: req.nextUrl.pathname,
      method: req.method,
    });
  }
}
