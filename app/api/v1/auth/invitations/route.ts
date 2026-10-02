import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { Platform } from "@/utils/platform";
import { handleApiError } from "@/lib/api/errors";
import { getInvitationByToken } from "@/lib/auth/adminInvitations";

const querySchema = z.object({
  platform: z.nativeEnum(Platform),
  token: z.string().min(1),
});

/**
 * What the accept-invite page shows before the invitee sets a password.
 * Public by necessity (the invitee has no account yet); the 256-bit token is
 * the credential, and every failure returns the same message.
 */
export async function GET(req: NextRequest) {
  try {
    const parsed = querySchema.safeParse(
      Object.fromEntries(req.nextUrl.searchParams)
    );
    if (!parsed.success) {
      return NextResponse.json(
        {
          success: false,
          error: "This invitation link is invalid or has expired.",
        },
        { status: 400 }
      );
    }
    const data = await getInvitationByToken(
      parsed.data.platform,
      parsed.data.token
    );
    return NextResponse.json({ success: true, data });
  } catch (err) {
    return handleApiError(err, {
      route: req.nextUrl.pathname,
      method: req.method,
    });
  }
}
