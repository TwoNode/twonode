import { NextResponse } from "next/server";
import { withAuth } from "@/lib/api/withAuth";
import { getAllUsers } from "@/surfboard/services/adminUserService";
import { parsePagination } from "@/lib/api/pagination";
import { Platform, SurfboardRole } from "@/utils/platform";

export const GET = withAuth<SurfboardRole>(
  async (req, ctx) => {
    const params = req.nextUrl.searchParams;
    const pagination = parsePagination(params);
    const data = await getAllUsers(ctx.session.role, {
      ...pagination,
      search: params.get("search") || undefined,
      roleGroup: params.get("roleGroup") === "mda" ? "mda" : "admins",
      role: params.get("role") || undefined,
      status: params.get("status") === "active" || params.get("status") === "inactive" ? params.get("status") as "active" | "inactive" : undefined,
      subscriptionStatus:
        params.get("subscriptionStatus") === "expired" || params.get("subscriptionStatus") === "expiring_soon"
          ? (params.get("subscriptionStatus") as "expired" | "expiring_soon")
          : undefined,
    });
    return NextResponse.json({ success: true, data });
  },
  { platform: Platform.SURFBOARD, roles: [SurfboardRole.ADMIN, SurfboardRole.SUPERADMIN] }
);
