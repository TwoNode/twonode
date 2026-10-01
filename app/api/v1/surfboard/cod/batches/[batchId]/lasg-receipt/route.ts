import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { withAuth } from "@/lib/api/withAuth";
import { validateBody } from "@/lib/api/validate";
import { validateCSRF } from "@/lib/auth/csrf";
import { uploadLASGReceipt } from "@/surfboard/services/remitaVerificationService";
import { Platform, SurfboardRole } from "@/utils/platform";

type RouteCtx = { params: Promise<{ batchId: string }> };
const bodySchema = z.object({ receiptUrl: z.string().url(), receiptS3Key: z.string().min(1) });

/** Admin manual receipt upload — receipt is already uploaded to S3 by the client; this just records it. */
export const POST = withAuth<SurfboardRole>(
  async (req: NextRequest, ctx, routeCtx: RouteCtx) => {
    if (!validateCSRF(req)) {
      return NextResponse.json({ success: false, error: "Cross-origin request blocked" }, { status: 403 });
    }
    const { batchId } = await routeCtx.params;
    const { receiptUrl, receiptS3Key } = await validateBody(req, bodySchema);
    const data = await uploadLASGReceipt(ctx.session.sub, ctx.session.role, batchId, receiptUrl, receiptS3Key);
    return NextResponse.json({ success: true, data });
  },
  { platform: Platform.SURFBOARD, roles: [SurfboardRole.ADMIN, SurfboardRole.SUPERADMIN] }
);
