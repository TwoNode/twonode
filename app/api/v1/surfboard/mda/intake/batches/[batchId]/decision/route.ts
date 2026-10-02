import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { withAuth } from "@/lib/api/withAuth";
import { validateBody } from "@/lib/api/validate";
import { validateCSRF } from "@/lib/auth/csrf";
import { updateIntakeBatchStatus } from "@/surfboard/services/batchApprovalService";
import { Platform, SurfboardRole } from "@/utils/platform";

type RouteCtx = { params: Promise<{ batchId: string }> };
const bodySchema = z.object({
  approved: z.boolean(),
  comment: z.string().optional(),
});

/** Batch-level variant: approves/queries every eligible plan in the batch in one transaction. */
export const POST = withAuth<SurfboardRole>(
  async (req: NextRequest, ctx, routeCtx: RouteCtx) => {
    if (!validateCSRF(req)) {
      return NextResponse.json(
        { success: false, error: "Cross-origin request blocked" },
        { status: 403 }
      );
    }
    const { batchId } = await routeCtx.params;
    const { approved, comment } = await validateBody(req, bodySchema);
    const data = await updateIntakeBatchStatus(
      ctx.session.sub,
      batchId,
      approved,
      comment
    );
    return NextResponse.json({ success: true, data });
  },
  {
    platform: Platform.SURFBOARD,
    roles: [SurfboardRole.INTAKE, SurfboardRole.SUPERADMIN],
  }
);
