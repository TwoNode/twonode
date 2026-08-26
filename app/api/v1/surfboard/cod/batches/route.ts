import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { withAuth } from "@/lib/api/withAuth";
import { validateBody } from "@/lib/api/validate";
import { validateCSRF } from "@/lib/auth/csrf";
import { getBatchesByStatus, getUserBatches, submitRedCopyBatch } from "@/surfboard/services/remitaVerificationService";
import { Platform, SurfboardRole } from "@/utils/platform";

/**
 * GET returns the caller's own batches for USER; ADMIN/SUPERADMIN instead
 * get every batch (optionally filtered by ?status=), matching the source's
 * two separate getUserBatches()/getBatchesByStatus() actions collapsed into
 * one route since they're the same resource at different scopes.
 */
export const GET = withAuth<SurfboardRole>(
  async (req, ctx) => {
    if (ctx.session.role === SurfboardRole.ADMIN || ctx.session.role === SurfboardRole.SUPERADMIN) {
      const status = req.nextUrl.searchParams.get("status") ?? undefined;
      const data = await getBatchesByStatus(status, ctx.session.role);
      return NextResponse.json({ success: true, data });
    }
    const data = await getUserBatches(ctx.session.sub);
    return NextResponse.json({ success: true, data });
  },
  { platform: Platform.SURFBOARD, roles: [SurfboardRole.USER, SurfboardRole.ADMIN, SurfboardRole.SUPERADMIN] }
);

const submitSchema = z.object({
  planIds: z.array(z.string().uuid()).min(1),
  acceptanceAcknowledged: z.literal(true),
});

export const POST = withAuth<SurfboardRole>(
  async (req: NextRequest, ctx) => {
    if (!validateCSRF(req)) {
      return NextResponse.json({ success: false, error: "Cross-origin request blocked" }, { status: 403 });
    }
    const { planIds, acceptanceAcknowledged } = await validateBody(req, submitSchema);
    const data = await submitRedCopyBatch(ctx.session.sub, planIds, acceptanceAcknowledged);
    return NextResponse.json({ success: true, data });
  },
  { platform: Platform.SURFBOARD, roles: [SurfboardRole.USER] }
);
