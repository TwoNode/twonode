import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { withAuth } from "@/lib/api/withAuth";
import { validateBody } from "@/lib/api/validate";
import { validateCSRF } from "@/lib/auth/csrf";
import { resubmitQueriedPlan } from "@/surfboard/services/batchApprovalService";
import { Platform, SurfboardRole } from "@/utils/platform";

type RouteCtx = { params: Promise<{ planId: string }> };

const bodySchema = z.object({
  pillars: z.any().optional(),
  recordCopyUrl: z.string().url().optional(),
  location: z
    .object({
      lga: z.string().optional(),
      lcda: z.string().optional(),
      ward: z.string().optional(),
      state: z.string().optional(),
    })
    .optional(),
  lasgReceiptUrl: z.string().url().optional(),
  remitaReceiptUrl: z.string().url().optional(),
});

export const POST = withAuth<SurfboardRole>(
  async (req: NextRequest, ctx, routeCtx: RouteCtx) => {
    if (!validateCSRF(req)) {
      return NextResponse.json(
        { success: false, error: "Cross-origin request blocked" },
        { status: 403 }
      );
    }
    const { planId } = await routeCtx.params;
    const {
      pillars,
      recordCopyUrl,
      location,
      lasgReceiptUrl,
      remitaReceiptUrl,
    } = await validateBody(req, bodySchema);
    const data = await resubmitQueriedPlan(
      ctx.session.sub,
      planId,
      pillars,
      recordCopyUrl,
      location,
      lasgReceiptUrl,
      remitaReceiptUrl
    );
    return NextResponse.json({ success: true, data });
  },
  { platform: Platform.SURFBOARD, roles: [SurfboardRole.USER] }
);
