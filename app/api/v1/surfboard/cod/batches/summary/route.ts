import { NextResponse } from "next/server";
import { withAuth } from "@/lib/api/withAuth";
import { getBatchSummaries } from "@/surfboard/services/batchSummaryService";
import { parseBatchSummaryQuery } from "@/surfboard/utils/batchSummaryQuery";
import { Platform, SurfboardRole } from "@/utils/platform";

/**
 * GET /api/v1/surfboard/cod/batches/summary?scope=active|history&search= — the
 * surveyor's batches for the app's Records tab (TASK-0015 1F.1): payment state,
 * how many plans can be handed in now, and a count per status. No submitter
 * details, payer id or receipt links (unlike `cod/batches`). `{ data, pagination }`.
 */
export const GET = withAuth<SurfboardRole>(
  async (req, ctx) => {
    const params = parseBatchSummaryQuery(req.nextUrl.searchParams);
    const data = await getBatchSummaries(ctx.session.sub, params);
    return NextResponse.json({ success: true, data });
  },
  { platform: Platform.SURFBOARD, roles: [SurfboardRole.USER] }
);
