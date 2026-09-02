import { NextResponse } from "next/server";
import { withAuth } from "@/lib/api/withAuth";
import { getAuditLogs } from "@/surfboard/services/auditLogService";
import { Platform, SurfboardRole } from "@/utils/platform";

export const GET = withAuth<SurfboardRole>(
  async (req) => {
    const params = req.nextUrl.searchParams;
    const page = params.get("page") ? Number(params.get("page")) : undefined;
    const pageSize = params.get("pageSize") ? Number(params.get("pageSize")) : undefined;
    const action = params.get("action") || undefined;
    const entity = params.get("entity") || undefined;
    const userId = params.get("userId") || undefined;
    const startDate = params.get("startDate") ? new Date(params.get("startDate")!) : undefined;
    const endDate = params.get("endDate") ? new Date(params.get("endDate")!) : undefined;

    const data = await getAuditLogs({ page, pageSize, action, entity, userId, startDate, endDate });
    return NextResponse.json({ success: true, data });
  },
  { platform: Platform.SURFBOARD, roles: [SurfboardRole.SUPERADMIN] }
);
