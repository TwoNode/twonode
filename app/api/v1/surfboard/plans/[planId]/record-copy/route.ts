import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { withAuth } from "@/lib/api/withAuth";
import { validateBody } from "@/lib/api/validate";
import { validateCSRF } from "@/lib/auth/csrf";
import { updatePlanRecordCopy } from "@/surfboard/services/planService";
import { Platform, SurfboardRole } from "@/utils/platform";

type RouteCtx = { params: Promise<{ planId: string }> };
const bodySchema = z.object({ redCopyFileUrl: z.string().url() });

export const PATCH = withAuth<SurfboardRole>(
  async (req: NextRequest, ctx, routeCtx: RouteCtx) => {
    if (!validateCSRF(req)) {
      return NextResponse.json({ success: false, error: "Cross-origin request blocked" }, { status: 403 });
    }
    const { planId } = await routeCtx.params;
    const { redCopyFileUrl } = await validateBody(req, bodySchema);
    const data = await updatePlanRecordCopy(ctx.session.sub, planId, redCopyFileUrl);
    return NextResponse.json({ success: true, data });
  },
  { platform: Platform.SURFBOARD, roles: [SurfboardRole.USER] }
);
