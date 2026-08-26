import { NextRequest, NextResponse } from "next/server";
import { withAuth } from "@/lib/api/withAuth";
import { validateCSRF } from "@/lib/auth/csrf";
import { queryPlan } from "@/surfboard/services/planService";
import { Platform, SurfboardRole } from "@/utils/platform";

type RouteCtx = { params: Promise<{ planId: string }> };

const NOT_USER_ROLES: SurfboardRole[] = [
  SurfboardRole.ADMIN,
  SurfboardRole.SUPERADMIN,
  SurfboardRole.ACCOUNTS,
  SurfboardRole.CHARTING,
  SurfboardRole.SURCON,
  SurfboardRole.RECORDS_I,
  SurfboardRole.INTAKE,
  SurfboardRole.RECORDS_II,
  SurfboardRole.ARCHIVE,
  SurfboardRole.MDA_SUPERADMIN,
];

export const POST = withAuth<SurfboardRole>(
  async (req: NextRequest, ctx, routeCtx: RouteCtx) => {
    if (!validateCSRF(req)) {
      return NextResponse.json({ success: false, error: "Cross-origin request blocked" }, { status: 403 });
    }
    const { planId } = await routeCtx.params;
    const data = await queryPlan(ctx.session.role, planId);
    return NextResponse.json({ success: true, data });
  },
  { platform: Platform.SURFBOARD, roles: NOT_USER_ROLES }
);
