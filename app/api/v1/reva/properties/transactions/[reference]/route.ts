import { NextResponse } from "next/server";
import { withAuth } from "@/lib/api/withAuth";
import { authGetTransactionData } from "@/reva/services/propertyRequestService";
import { Platform, RevaRole } from "@/utils/platform";

type RouteCtx = { params: Promise<{ reference: string }> };

export const GET = withAuth<RevaRole>(
  async (_req, _ctx, routeCtx: RouteCtx) => {
    const { reference } = await routeCtx.params;
    const data = await authGetTransactionData(reference);
    return NextResponse.json({ success: true, data });
  },
  {
    platform: Platform.REVA,
    roles: [RevaRole.USER, RevaRole.ADMIN, RevaRole.SUPERADMIN],
  }
);
