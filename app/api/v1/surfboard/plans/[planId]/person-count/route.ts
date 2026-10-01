import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { withAuth } from "@/lib/api/withAuth";
import { validateBody } from "@/lib/api/validate";
import { validateCSRF } from "@/lib/auth/csrf";
import { verifyPersonCount } from "@/surfboard/services/planService";
import { Platform, SurfboardRole } from "@/utils/platform";

type RouteCtx = { params: Promise<{ planId: string }> };
const bodySchema = z.object({ count: z.number().int().min(1) });

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

export const PATCH = withAuth<SurfboardRole>(
  async (req: NextRequest, ctx, routeCtx: RouteCtx) => {
    if (!validateCSRF(req)) {
      return NextResponse.json({ success: false, error: "Cross-origin request blocked" }, { status: 403 });
    }
    const { planId } = await routeCtx.params;
    const { count } = await validateBody(req, bodySchema);
    const data = await verifyPersonCount(ctx.session.role, planId, count);
    return NextResponse.json({ success: true, data });
  },
  { platform: Platform.SURFBOARD, roles: NOT_USER_ROLES }
);
