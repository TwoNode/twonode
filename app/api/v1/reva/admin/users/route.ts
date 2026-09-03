import { NextResponse } from "next/server";
import { z } from "zod";
import { withAuth } from "@/lib/api/withAuth";
import { validateBody } from "@/lib/api/validate";
import { validateCSRF } from "@/lib/auth/csrf";
import { ForbiddenError } from "@/lib/api/errors";
import { getAllUsers, getAllAdminUsers, createAdminUser } from "@/reva/services/adminUserService";
import { Platform, RevaRole } from "@/utils/platform";

/**
 * `?scope=all` (default) — the full user base, ADMIN or SUPERADMIN.
 * `?scope=admins` — who else has admin rights, SUPERADMIN only (more
 * sensitive than the general user list, so it gets the tighter gate).
 */
export const GET = withAuth<RevaRole>(
  async (req, ctx) => {
    const scope = req.nextUrl.searchParams.get("scope") ?? "all";

    if (scope === "admins") {
      if (ctx.session.role !== RevaRole.SUPERADMIN) throw new ForbiddenError();
      const data = await getAllAdminUsers();
      return NextResponse.json({ success: true, data });
    }

    const data = await getAllUsers();
    return NextResponse.json({ success: true, data });
  },
  { platform: Platform.REVA, roles: [RevaRole.ADMIN, RevaRole.SUPERADMIN] }
);

const createAdminUserSchema = z.object({
  email: z.string().email(),
  firstName: z.string().min(1),
  lastName: z.string().min(1),
  role: z.enum(["ADMIN", "SUPERADMIN"]),
});

export const POST = withAuth<RevaRole>(
  async (req) => {
    if (!validateCSRF(req)) {
      return NextResponse.json({ success: false, error: "Cross-origin request blocked" }, { status: 403 });
    }
    const body = await validateBody(req, createAdminUserSchema);
    const data = await createAdminUser(body);
    return NextResponse.json({ success: true, data });
  },
  { platform: Platform.REVA, roles: [RevaRole.SUPERADMIN] }
);
