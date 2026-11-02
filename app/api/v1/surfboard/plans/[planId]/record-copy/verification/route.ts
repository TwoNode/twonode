import { NextResponse } from "next/server";
import { z } from "zod";
import { withAuth } from "@/lib/api/withAuth";
import { validateBody } from "@/lib/api/validate";
import { validateCSRF } from "@/lib/auth/csrf";
import { savePlanVerificationResult } from "@/surfboard/services/verificationService";
import { Platform, SurfboardRole } from "@/utils/platform";

type RouteCtx = { params: Promise<{ planId: string }> };

const schema = z.object({
  verdict: z.string().min(1),
  score: z.number(),
  verificationData: z.any(),
});

export const POST = withAuth<SurfboardRole>(
  async (req, ctx, routeCtx: RouteCtx) => {
    if (!validateCSRF(req)) {
      return NextResponse.json(
        { success: false, error: "Cross-origin request blocked" },
        { status: 403 }
      );
    }
    const { planId } = await routeCtx.params;
    const { verdict, score, verificationData } = await validateBody(
      req,
      schema
    );
    // The plan's owner or an admin only (I-047): a plan id is in its public QR address.
    const data = await savePlanVerificationResult(
      ctx.session.sub,
      ctx.session.role,
      planId,
      verdict,
      score,
      verificationData
    );
    return NextResponse.json({ success: true, data });
  },
  {
    platform: Platform.SURFBOARD,
    roles: [SurfboardRole.USER, SurfboardRole.ADMIN, SurfboardRole.SUPERADMIN],
  }
);
