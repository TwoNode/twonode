import { NextResponse } from "next/server";
import { withAuth } from "@/lib/api/withAuth";
import { getAllSharedSurfPlans } from "@/surfboard/services/planService";
import { Platform, SurfboardRole } from "@/utils/platform";

export const GET = withAuth<SurfboardRole>(
  async (req, ctx) => {
    const sp = req.nextUrl.searchParams;
    const page = sp.get("page") ? Number(sp.get("page")) : 1;
    const pageSize = sp.get("pageSize") ? Number(sp.get("pageSize")) : 10;
    const filters = {
      search: sp.get("search") ?? undefined,
      status: sp.get("status")?.split(",").filter(Boolean),
      planType: sp.get("planType")?.split(",").filter(Boolean),
      facilitator: sp.get("facilitator") ?? undefined,
      dateFrom: sp.get("dateFrom") ? new Date(sp.get("dateFrom")!) : undefined,
      dateTo: sp.get("dateTo") ? new Date(sp.get("dateTo")!) : undefined,
    };
    const sortField = sp.get("sortField");
    const sortOrder = sp.get("sortOrder");
    const sort =
      sortField && sortOrder
        ? { field: sortField as any, order: sortOrder as "asc" | "desc" }
        : undefined;

    const data = await getAllSharedSurfPlans(
      ctx.session.sub,
      page,
      pageSize,
      filters,
      sort
    );
    return NextResponse.json({ success: true, data });
  },
  { platform: Platform.SURFBOARD, roles: [SurfboardRole.USER] }
);
