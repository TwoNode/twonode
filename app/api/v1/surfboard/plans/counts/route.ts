import { NextResponse } from "next/server";
import { withAuth } from "@/lib/api/withAuth";
import { getPlanCounts } from "@/surfboard/services/planSummaryService";
import { Platform, SurfboardRole } from "@/utils/platform";

/**
 * GET /api/v1/surfboard/plans/counts — the numbers on the app's Plans tab and
 * its badges: `{ mine, sharedWithMe, queried, readyForPhysicalSubmission }`,
 * counted with the same rules as `plans/summary` (see `surfboard/utils/planStatus.ts`).
 */
export const GET = withAuth<SurfboardRole>(
  async (_req, ctx) => {
    const data = await getPlanCounts(ctx.session.sub);
    return NextResponse.json({ success: true, data });
  },
  { platform: Platform.SURFBOARD, roles: [SurfboardRole.USER] }
);
