import { NextResponse } from "next/server";
import { withAuth } from "@/lib/api/withAuth";
import { parsePagination } from "@/lib/api/pagination";
import { getAdminSurfPlansPaginated } from "@/surfboard/services/planService";
import { Platform, SurfboardRole } from "@/utils/platform";

export const GET = withAuth<SurfboardRole>(
  async (req) => {
    const params = req.nextUrl.searchParams;
    const pagination = parsePagination(params);
    const data = await getAdminSurfPlansPaginated({
      ...pagination,
      search: params.get("search") || undefined,
      status: params.get("status") || undefined,
      tab:
        (params.get("tab") as "all" | "person-count" | "queries" | null) ||
        undefined,
    });
    return NextResponse.json({ success: true, data });
  },
  {
    platform: Platform.SURFBOARD,
    roles: [SurfboardRole.ADMIN, SurfboardRole.SUPERADMIN],
  }
);
