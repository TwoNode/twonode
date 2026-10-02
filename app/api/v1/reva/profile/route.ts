import { NextResponse } from "next/server";
import { z } from "zod";
import { withAuth } from "@/lib/api/withAuth";
import { validateBody } from "@/lib/api/validate";
import { validateCSRF } from "@/lib/auth/csrf";
import { getProfile, updateProfile } from "@/reva/services/profileService";
import { Platform, RevaRole } from "@/utils/platform";

export const GET = withAuth<RevaRole>(
  async (_req, ctx) => {
    const data = await getProfile(ctx.session.sub);
    return NextResponse.json({ success: true, data });
  },
  {
    platform: Platform.REVA,
    roles: [RevaRole.USER, RevaRole.ADMIN, RevaRole.SUPERADMIN],
  }
);

const updateSchema = z.object({
  firstName: z.string().min(1).optional(),
  lastName: z.string().min(1).optional(),
  email: z.string().email().optional(),
});

export const PATCH = withAuth<RevaRole>(
  async (req, ctx) => {
    if (!validateCSRF(req)) {
      return NextResponse.json(
        { success: false, error: "Cross-origin request blocked" },
        { status: 403 }
      );
    }
    const body = await validateBody(req, updateSchema);
    const data = await updateProfile(ctx.session.sub, body);
    return NextResponse.json({ success: true, data });
  },
  {
    platform: Platform.REVA,
    roles: [RevaRole.USER, RevaRole.ADMIN, RevaRole.SUPERADMIN],
  }
);
