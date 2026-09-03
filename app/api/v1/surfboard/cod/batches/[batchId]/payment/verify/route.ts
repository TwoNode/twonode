import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { withAuth } from "@/lib/api/withAuth";
import { validateBody } from "@/lib/api/validate";
import { validateCSRF } from "@/lib/auth/csrf";
import { verifyBatchPayment } from "@/surfboard/services/remitaVerificationService";
import { Platform, SurfboardRole } from "@/utils/platform";

type RouteCtx = { params: Promise<{ batchId: string }> };
const bodySchema = z.object({ reference: z.string().min(1) });

/** Legacy single-reference Remita verification path — still live, confirmed by the Phase 2 spec's grep audit. */
export const POST = withAuth<SurfboardRole>(
  async (req: NextRequest, ctx, routeCtx: RouteCtx) => {
    if (!validateCSRF(req)) {
      return NextResponse.json({ success: false, error: "Cross-origin request blocked" }, { status: 403 });
    }
    await routeCtx.params; // batchId unused — verifyBatchPayment looks the batch up by reference, matching the source
    const { reference } = await validateBody(req, bodySchema);
    const data = await verifyBatchPayment(ctx.session.sub, reference);
    return NextResponse.json({ success: true, data });
  },
  { platform: Platform.SURFBOARD, roles: [SurfboardRole.USER] }
);
