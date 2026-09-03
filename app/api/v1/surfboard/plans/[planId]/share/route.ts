import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { withAuth } from "@/lib/api/withAuth";
import { validateBody } from "@/lib/api/validate";
import { validateCSRF } from "@/lib/auth/csrf";
import { getUserDisplayName, sharePlanWithUser, unsharePlanWithUser } from "@/surfboard/services/planService";
import { Platform, SurfboardRole } from "@/utils/platform";

type RouteCtx = { params: Promise<{ planId: string }> };
const bodySchema = z.object({ userId: z.string().min(1) });

export const POST = withAuth<SurfboardRole>(
  async (req: NextRequest, ctx, routeCtx: RouteCtx) => {
    if (!validateCSRF(req)) {
      return NextResponse.json({ success: false, error: "Cross-origin request blocked" }, { status: 403 });
    }
    const { planId } = await routeCtx.params;
    const { userId: targetUserId } = await validateBody(req, bodySchema);
    const user = await getUserDisplayName(ctx.session.sub);
    const data = await sharePlanWithUser(ctx.session.sub, user, planId, targetUserId);
    return NextResponse.json({ success: true, data });
  },
  { platform: Platform.SURFBOARD, roles: [SurfboardRole.USER] }
);

export const DELETE = withAuth<SurfboardRole>(
  async (req: NextRequest, ctx, routeCtx: RouteCtx) => {
    if (!validateCSRF(req)) {
      return NextResponse.json({ success: false, error: "Cross-origin request blocked" }, { status: 403 });
    }
    const { planId } = await routeCtx.params;
    const { userId: targetUserId } = await validateBody(req, bodySchema);
    const data = await unsharePlanWithUser(ctx.session.sub, planId, targetUserId);
    return NextResponse.json({ success: true, data });
  },
  { platform: Platform.SURFBOARD, roles: [SurfboardRole.USER] }
);
