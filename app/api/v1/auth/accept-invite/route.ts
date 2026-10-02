import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { Platform } from "@/utils/platform";
import { validateCSRF } from "@/lib/auth/csrf";
import { validateBody } from "@/lib/api/validate";
import { handleApiError } from "@/lib/api/errors";
import { acceptInvitation } from "@/lib/auth/adminInvitations";
import { announceAdminJoined } from "@/reva/services/adminUserService";

const acceptSchema = z.object({
  platform: z.nativeEnum(Platform),
  token: z.string().min(1),
  // Stronger than register/reset's 6: this creates a privileged account.
  password: z.string().min(8, "Password must be at least 8 characters"),
  firstName: z.string().trim().min(1).optional(),
  lastName: z.string().trim().min(1).optional(),
});

export async function POST(req: NextRequest) {
  try {
    if (!validateCSRF(req)) {
      return NextResponse.json(
        { success: false, error: "Cross-origin request blocked" },
        { status: 403 }
      );
    }

    const body = await validateBody(req, acceptSchema);
    const { user, loginPath } = await acceptInvitation(body);

    // REVA tells its superadmins when an admin joins; the account is created
    // here now rather than when the invitation was sent.
    if (body.platform === Platform.REVA) {
      await announceAdminJoined({
        email: user.email,
        firstName: user.firstName ?? "",
        lastName: user.lastName ?? "",
        role: user.role,
      });
    }

    return NextResponse.json({
      success: true,
      data: {
        message: "Your account is ready. You can now sign in.",
        loginPath,
      },
    });
  } catch (err) {
    return handleApiError(err, {
      route: req.nextUrl.pathname,
      method: req.method,
    });
  }
}
