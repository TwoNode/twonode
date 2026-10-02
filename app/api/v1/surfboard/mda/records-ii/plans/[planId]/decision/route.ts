import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { withAuth } from "@/lib/api/withAuth";
import { validateBody } from "@/lib/api/validate";
import { validateCSRF } from "@/lib/auth/csrf";
import { updateRecordsIIStatus } from "@/surfboard/services/batchApprovalService";
import { Platform, SurfboardRole } from "@/utils/platform";

type RouteCtx = { params: Promise<{ planId: string }> };
const bodySchema = z.object({
  approved: z.boolean(),
  comment: z.string().optional(),
});

/**
 * Kept as its own route rather than folded into the shared /mda/:role
 * decision route above — approval here transmits to OSSG and sets the
 * plan LODGED, materially different side effects worth a distinct handler.
 */
export const POST = withAuth<SurfboardRole>(
  async (req: NextRequest, ctx, routeCtx: RouteCtx) => {
    if (!validateCSRF(req)) {
      return NextResponse.json(
        { success: false, error: "Cross-origin request blocked" },
        { status: 403 }
      );
    }
    const { planId } = await routeCtx.params;
    const { approved, comment } = await validateBody(req, bodySchema);
    const data = await updateRecordsIIStatus(
      ctx.session.sub,
      planId,
      approved,
      comment
    );
    return NextResponse.json({ success: true, data });
  },
  {
    platform: Platform.SURFBOARD,
    roles: [SurfboardRole.RECORDS_II, SurfboardRole.SUPERADMIN],
  }
);
