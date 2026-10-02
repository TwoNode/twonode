import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { Platform } from "@/utils/platform";
import prisma from "@/lib/prisma";
import { clearAuthCookies } from "@/lib/auth/cookies";
import { validateCSRF } from "@/lib/auth/csrf";
import { getServerSession } from "@/lib/auth/session";
import { validateBody } from "@/lib/api/validate";
import { handleApiError } from "@/lib/api/errors";

const logoutSchema = z.object({ platform: z.nativeEnum(Platform) });

export async function POST(req: NextRequest) {
  try {
    if (!validateCSRF(req)) {
      return NextResponse.json(
        { success: false, error: "Cross-origin request blocked" },
        { status: 403 }
      );
    }

    const { platform } = await validateBody(req, logoutSchema);

    // The refresh_token cookie is scoped to /api/v1/auth/refresh, so it's not
    // sent here. Read the access_token to identify the user and revoke all
    // their active refresh tokens on this platform by userId instead.
    const session = await getServerSession(platform);
    if (session) {
      await prisma.refreshToken
        .updateMany({
          where: { userId: session.sub, platform, revokedAt: null },
          data: { revokedAt: new Date() },
        })
        .catch(() => {});
    }

    await clearAuthCookies(platform);
    return NextResponse.json({ success: true, data: {} });
  } catch (err) {
    return handleApiError(err, {
      route: req.nextUrl.pathname,
      method: req.method,
    });
  }
}
