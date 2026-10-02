import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { withAuth } from "@/lib/api/withAuth";
import { validateBody } from "@/lib/api/validate";
import { validateCSRF } from "@/lib/auth/csrf";
import { updateAccountsApproval } from "@/surfboard/services/batchApprovalService";
import { Platform, SurfboardRole } from "@/utils/platform";

type RouteCtx = { params: Promise<{ batchId: string }> };
const bodySchema = z.object({
  approved: z.boolean(),
  comment: z.string().optional(),
});

/** Note: MDA_SUPERADMIN can view (see the sibling GET route) but not decide — matches the source's role check exactly. */
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
    const data = await updateAccountsApproval(
      ctx.session.sub,
      batchId,
      approved,
      comment
    );
    return NextResponse.json({ success: true, data });
  },
  {
    platform: Platform.SURFBOARD,
    roles: [SurfboardRole.ACCOUNTS, SurfboardRole.SUPERADMIN],
  }
);
