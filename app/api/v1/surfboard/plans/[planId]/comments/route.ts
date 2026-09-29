import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { withAuth } from "@/lib/api/withAuth";
import { validateBody } from "@/lib/api/validate";
import { validateCSRF } from "@/lib/auth/csrf";
import { addPlanComment, getPlanComments } from "@/surfboard/services/planCommentService";
import { Platform, SurfboardRole } from "@/utils/platform";

type RouteCtx = { params: Promise<{ planId: string }> };
const bodySchema = z.object({ body: z.string().min(1).max(2000) });

export const GET = withAuth<SurfboardRole>(
  async (_req: NextRequest, ctx, routeCtx: RouteCtx) => {
    const { planId } = await routeCtx.params;
    const data = await getPlanComments(ctx.session.sub, planId);
    return NextResponse.json({ success: true, data });
  },
  { platform: Platform.SURFBOARD, roles: [SurfboardRole.USER] }
);

export const POST = withAuth<SurfboardRole>(
  async (req: NextRequest, ctx, routeCtx: RouteCtx) => {
    if (!validateCSRF(req)) {
      return NextResponse.json({ success: false, error: "Cross-origin request blocked" }, { status: 403 });
    }
    const { planId } = await routeCtx.params;
    const { body } = await validateBody(req, bodySchema);
    const data = await addPlanComment(ctx.session.sub, planId, body);
    return NextResponse.json({ success: true, data });
  },
  { platform: Platform.SURFBOARD, roles: [SurfboardRole.USER] }
);
