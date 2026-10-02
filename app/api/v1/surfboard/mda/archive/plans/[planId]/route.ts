import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { withAuth } from "@/lib/api/withAuth";
import { validateBody } from "@/lib/api/validate";
import { validateCSRF } from "@/lib/auth/csrf";
import { markPlanArchived } from "@/surfboard/services/batchApprovalService";
import { Platform, SurfboardRole } from "@/utils/platform";

type RouteCtx = { params: Promise<{ planId: string }> };
const bodySchema = z.object({ notes: z.string().optional() });

/** Unlike the other decision routes, MDA_SUPERADMIN can act here too — matches the source's role check exactly. */
export const POST = withAuth<SurfboardRole>(
  async (req: NextRequest, ctx, routeCtx: RouteCtx) => {
    if (!validateCSRF(req)) {
      return NextResponse.json(
        { success: false, error: "Cross-origin request blocked" },
        { status: 403 }
      );
    }
    const { planId } = await routeCtx.params;
    const { notes } = await validateBody(req, bodySchema);
    const data = await markPlanArchived(ctx.session.sub, planId, notes);
    return NextResponse.json({ success: true, data });
  },
  {
    platform: Platform.SURFBOARD,
    roles: [
      SurfboardRole.ARCHIVE,
      SurfboardRole.SUPERADMIN,
      SurfboardRole.MDA_SUPERADMIN,
    ],
  }
);
