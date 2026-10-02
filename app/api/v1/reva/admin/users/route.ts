import { NextResponse } from "next/server";
import { withAuth } from "@/lib/api/withAuth";
import { ForbiddenError } from "@/lib/api/errors";
import { parsePagination } from "@/lib/api/pagination";
import {
  getAllUsers,
  getAllAdminUsers,
  getAllUsersPaginated,
} from "@/reva/services/adminUserService";
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
