import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { Platform } from "@/utils/platform";
import { revokeFamilyByRefreshToken } from "@/lib/auth/deviceSessions";
import { validateBody } from "@/lib/api/validate";
import { handleApiError } from "@/lib/api/errors";

const logoutSchema = z.object({
  platform: z.literal(Platform.SURFBOARD),
  refreshToken: z.string().min(16).max(256),
});

/**
 * POST /api/v1/auth/mobile/logout — ends this device's session by revoking its
 * refresh-token family. Always answers success, whether or not a live session
 * was found, so it reveals nothing about a token's state.
 */
export async function POST(req: NextRequest) {
  try {
    const { platform, refreshToken } = await validateBody(req, logoutSchema);
    await revokeFamilyByRefreshToken(platform, refreshToken);
    return NextResponse.json({ success: true, data: {} });
  } catch (err) {
    return handleApiError(err, {
      route: req.nextUrl.pathname,
      method: req.method,
    });
  }
}
