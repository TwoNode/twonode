import { NextResponse } from "next/server";
import { z } from "zod";
import { withAuth } from "@/lib/api/withAuth";
import { validateBody } from "@/lib/api/validate";
import { validateCSRF } from "@/lib/auth/csrf";
import { ForbiddenError } from "@/lib/api/errors";
import { parsePagination } from "@/lib/api/pagination";
import { getAllUsers, getAllAdminUsers, getAllUsersPaginated, createAdminUser } from "@/reva/services/adminUserService";
import { Platform, RevaRole } from "@/utils/platform";

/**
 * `?scope=all` (default) — the full user base, ADMIN or SUPERADMIN.
 * `?scope=admins` — who else has admin rights, SUPERADMIN only (more
 * sensitive than the general user list, so it gets the tighter gate).
 *
 * Opt-in: passing `page` switches to the paginated/searchable variant (the
 * two browsable list cards on the Super Admin page) — omitting it keeps the
 * original full-array shape (UserRoleManagementForm's dropdown needs every
 * user at once, not one page).
 */
export const GET = withAuth<RevaRole>(
  async (req, ctx) => {
    const params = req.nextUrl.searchParams;
    const scope = params.get("scope") ?? "all";

    if (scope === "admins" && ctx.session.role !== RevaRole.SUPERADMIN) {
      throw new ForbiddenError();
    }

    if (params.has("page")) {
      const pagination = parsePagination(params);
      const data = await getAllUsersPaginated({
        ...pagination,
        scope: scope === "admins" || scope === "users" ? scope : "all",
        search: params.get("search") || undefined,
      });
      return NextResponse.json({ success: true, data });
    }

    if (scope === "admins") {
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
