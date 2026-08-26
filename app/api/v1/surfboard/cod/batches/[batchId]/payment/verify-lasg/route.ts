import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { withAuth } from "@/lib/api/withAuth";
import { validateBody } from "@/lib/api/validate";
import { validateCSRF } from "@/lib/auth/csrf";
import { verifyLASGReceiptLink } from "@/surfboard/services/remitaVerificationService";
import { Platform, SurfboardRole } from "@/utils/platform";

type RouteCtx = { params: Promise<{ batchId: string }> };
const bodySchema = z.object({ receiptUrl: z.string().url() });

/** Fallback single-receipt AI-analysis path (vs. the two-link cross-validated flow above). */
export const POST = withAuth<SurfboardRole>(
  async (req: NextRequest, ctx, routeCtx: RouteCtx) => {
    if (!validateCSRF(req)) {
      return NextResponse.json({ success: false, error: "Cross-origin request blocked" }, { status: 403 });
    }
    const { batchId } = await routeCtx.params;
    const { receiptUrl } = await validateBody(req, bodySchema);
    const data = await verifyLASGReceiptLink(ctx.session.sub, ctx.session.role, batchId, receiptUrl);
    return NextResponse.json({ success: true, data });
  },
  { platform: Platform.SURFBOARD, roles: [SurfboardRole.USER, SurfboardRole.SUPERADMIN] }
);
