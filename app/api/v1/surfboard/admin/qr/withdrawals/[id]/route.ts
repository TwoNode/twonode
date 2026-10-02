import { NextResponse } from "next/server";
import { z } from "zod";
import { withAuth } from "@/lib/api/withAuth";
import { validateBody } from "@/lib/api/validate";
import { validateCSRF } from "@/lib/auth/csrf";
import { processAdminWithdrawalRequest } from "@/surfboard/services/qrAdminService";
import { Platform, SurfboardRole } from "@/utils/platform";

type RouteCtx = { params: Promise<{ id: string }> };

const schema = z.object({
  action: z.enum(["APPROVE_PAYOUT", "REJECT"]),
  adminComment: z.string().optional(),
});

export const PATCH = withAuth<SurfboardRole>(
  async (req, ctx, routeCtx: RouteCtx) => {
    if (!validateCSRF(req)) {
      return NextResponse.json(
        { success: false, error: "Cross-origin request blocked" },
        { status: 403 }
      );
    }
    const { id } = await routeCtx.params;
    const { action, adminComment } = await validateBody(req, schema);
    const data = await processAdminWithdrawalRequest(
      ctx.session.sub,
      id,
      action,
      adminComment
    );
    return NextResponse.json({ success: true, data });
  },
  {
    platform: Platform.SURFBOARD,
    roles: [SurfboardRole.ADMIN, SurfboardRole.SUPERADMIN],
  }
);
