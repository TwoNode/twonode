import { NextResponse } from "next/server";
import { withAuth } from "@/lib/api/withAuth";
import { getAllRequestsWithUserByAdmin } from "@/reva/services/reportService";
import { Platform, RevaRole } from "@/utils/platform";

export const GET = withAuth<RevaRole>(
  async (req) => {
    const params = req.nextUrl.searchParams;
    const limitParam = params.get("limit");
    const data = await getAllRequestsWithUserByAdmin({
      limit: limitParam ? Number(limitParam) : undefined,
      onlyWithReport: params.get("onlyWithReport") === "true",
      includeOneTimeRequests: params.get("includeOneTimeRequests") === "true",
    });
    return NextResponse.json({ success: true, data });
  },
  { platform: Platform.REVA, roles: [RevaRole.ADMIN, RevaRole.SUPERADMIN] }
);
