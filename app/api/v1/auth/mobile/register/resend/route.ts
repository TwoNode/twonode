import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { Platform } from "@/utils/platform";
import { consumeRateLimit } from "@/lib/auth/rateLimit";
import { validateBody } from "@/lib/api/validate";
import { handleApiError } from "@/lib/api/errors";
import { assertMobileClientAllowed } from "@/lib/api/mobileApp";
import { resendPendingRegistration } from "@/lib/auth/pendingRegistration";
import { mobileRequestContext } from "@/lib/observability/mobileTags";

const resendSchema = z.object({
  platform: z.literal(Platform.SURFBOARD),
  pendingRegistrationId: z.string().min(1).max(64),
  deviceId: z.string().min(8).max(128),
});

// A resend sends an email, so it is limited per registration (the inbox it mails) and per device.
const REGISTRATION_LIMIT = { max: 5, windowMs: 60 * 60 * 1000 };
const DEVICE_LIMIT = { max: 10, windowMs: 60 * 60 * 1000 };

/**
 * POST /api/v1/auth/mobile/register/resend: emails a fresh six-digit code for a registration the
 * app started (the old one stops working). Answers the same 200 whether or not the registration
 * exists, was used, or belongs to someone else (resendPendingRegistration does nothing then), so
 * it cannot be used to find out which ids are live.
 */
export async function POST(req: NextRequest) {
  try {
    await assertMobileClientAllowed(req);

    const { platform, pendingRegistrationId, deviceId } = await validateBody(
      req,
      resendSchema
    );

    const allowed =
      (await consumeRateLimit(
        `mobile-register-resend-device:${deviceId}`,
        undefined,
        DEVICE_LIMIT
      )) &&
      (await consumeRateLimit(
        `mobile-register-resend:${pendingRegistrationId}`,
        undefined,
        REGISTRATION_LIMIT
      ));
    if (!allowed) {
      return NextResponse.json(
        {
          success: false,
          error: "Too many attempts. Try again later.",
          code: "RATE_LIMITED",
        },
        { status: 429 }
      );
    }

    await resendPendingRegistration(platform, pendingRegistrationId);
    return NextResponse.json(
      { success: true, data: {} },
      { headers: { "Cache-Control": "no-store" } }
    );
  } catch (err) {
    return handleApiError(err, mobileRequestContext(req));
  }
}
