import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { withAuth } from "@/lib/api/withAuth";
import { validateBody } from "@/lib/api/validate";
import { NotFoundError } from "@/lib/api/errors";
import { validateCSRF } from "@/lib/auth/csrf";
import {
  EXPO_TOKEN,
  PUSH_OS,
  registerDeviceToken,
  removeDeviceToken,
} from "@/lib/push/deviceTokens";
import { Platform, SurfboardRole } from "@/utils/platform";

const registerSchema = z.object({
  /** The same id the app sent at mobile login: it ties the token to that device session. */
  deviceId: z.string().min(8).max(128),
  token: z.string().regex(EXPO_TOKEN),
  os: z.enum(PUSH_OS),
  appVersion: z.string().max(32).optional(),
});

const removeSchema = z.object({ deviceId: z.string().min(8).max(128) });

const blocked = () =>
  NextResponse.json(
    { success: false, error: "Cross-origin request blocked" },
    { status: 403 }
  );

/**
 * POST /api/v1/auth/mobile/push-token — the app registers this install's push
 * token (TASK-0015 1I.1), on each launch while push is allowed (it is an
 * upsert). The token is kept only for a `deviceId` that is a live device
 * session of the caller (else 404), and is moved to the caller if it was
 * another person's (a phone someone else signs in on). Nothing is returned
 * but `{}`: the token is never read back.
 */
export const POST = withAuth<SurfboardRole>(
  async (req: NextRequest, { session }) => {
    if (!validateCSRF(req)) return blocked();
    const body = await validateBody(req, registerSchema);
    const kept = await registerDeviceToken(
      session.sub,
      Platform.SURFBOARD,
      body
    );
    if (!kept) throw new NotFoundError("Device session");
    return NextResponse.json({ success: true, data: {} });
  },
  { platform: Platform.SURFBOARD, roles: [SurfboardRole.USER] }
);

/**
 * DELETE /api/v1/auth/mobile/push-token — the app turned push off or is
 * signing out. Forgets this device's token; answers success whether or not
 * there was one. (Signing out or revoking the device removes it as well.)
 */
export const DELETE = withAuth<SurfboardRole>(
  async (req: NextRequest, { session }) => {
    if (!validateCSRF(req)) return blocked();
    const { deviceId } = await validateBody(req, removeSchema);
    await removeDeviceToken(session.sub, Platform.SURFBOARD, deviceId);
    return NextResponse.json({ success: true, data: {} });
  },
  // Turning push off must work even while email verification is outstanding.
  {
    platform: Platform.SURFBOARD,
    roles: [SurfboardRole.USER],
    allowUnverified: true,
  }
);
