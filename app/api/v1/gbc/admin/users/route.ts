import { NextResponse } from "next/server";
import { withAuth } from "@/lib/api/withAuth";
import { parsePagination } from "@/lib/api/pagination";
import {
  getAllAdmins,
  getAllAdminsPaginated,
} from "@/gbc/services/adminUserService";
import { Platform, GBCRole } from "@/utils/platform";

/** Opt-in: `?page=` switches to the paginated/searchable variant (the admin Users page) — omitting it keeps the original full-array shape. */
export const GET = withAuth<GBCRole>(
  async (req) => {
    const params = req.nextUrl.searchParams;
    if (params.has("page")) {
      const pagination = parsePagination(params);
      const roles = params.get("roles")?.split(",").filter(Boolean) as
        ("ADMIN" | "SUPERADMIN")[] | undefined;
      const statuses = params
        .get("statuses")
        ?.split(",")
        .filter(Boolean)
        .map((s) => s === "true");
      const data = await getAllAdminsPaginated({
        ...pagination,
        search: params.get("search") || undefined,
        roles: roles?.length ? roles : undefined,
        statuses: statuses?.length ? statuses : undefined,
      });
      return NextResponse.json({ success: true, data });
    }

    const data = await getAllAdmins();
    return NextResponse.json({ success: true, data });
  },
  { platform: Platform.GBC, roles: [GBCRole.ADMIN, GBCRole.SUPERADMIN] }
);
