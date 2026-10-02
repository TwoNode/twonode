import { NextResponse } from "next/server";
import { withAuth } from "@/lib/api/withAuth";
import { ForbiddenError, ValidationError } from "@/lib/api/errors";
import {
  getChartingHistory,
  getChartingPlans,
  getRecordsIHistory,
  getRecordsIPlans,
  getRecordsIIHistory,
  getRecordsIIPlans,
  getSurconHistory,
  getSurconPlans,
} from "@/surfboard/services/batchApprovalService";
import { Platform, SurfboardRole } from "@/utils/platform";

type RouteCtx = { params: Promise<{ role: string }> };

const ROLE_MAP: Record<
  string,
  {
    role: SurfboardRole;
    queue: () => Promise<any>;
    history: () => Promise<any>;
  }
> = {
  charting: {
    role: SurfboardRole.CHARTING,
    queue: getChartingPlans,
    history: getChartingHistory,
  },
  surcon: {
    role: SurfboardRole.SURCON,
    queue: getSurconPlans,
    history: getSurconHistory,
  },
  "records-i": {
    role: SurfboardRole.RECORDS_I,
    queue: getRecordsIPlans,
    history: getRecordsIHistory,
  },
  "records-ii": {
    role: SurfboardRole.RECORDS_II,
    queue: getRecordsIIPlans,
    history: getRecordsIIHistory,
  },
};

/** :role selects both the required session role and which pair of service functions runs — one route instead of 4 near-identical ones. */
export const GET = withAuth<SurfboardRole>(
  async (req, ctx, routeCtx: RouteCtx) => {
    const { role } = await routeCtx.params;
    const entry = ROLE_MAP[role];
    if (!entry)
      throw new ValidationError({ role: `Unknown MDA role "${role}"` });
    if (
      ctx.session.role !== entry.role &&
      ctx.session.role !== SurfboardRole.SUPERADMIN &&
      ctx.session.role !== SurfboardRole.MDA_SUPERADMIN
    ) {
      throw new ForbiddenError();
    }

    const view = req.nextUrl.searchParams.get("view");
    const data =
      view === "history" ? await entry.history() : await entry.queue();
    return NextResponse.json({ success: true, data });
  },
  {
    platform: Platform.SURFBOARD,
    roles: [
      SurfboardRole.CHARTING,
      SurfboardRole.SURCON,
      SurfboardRole.RECORDS_I,
      SurfboardRole.RECORDS_II,
      SurfboardRole.SUPERADMIN,
      SurfboardRole.MDA_SUPERADMIN,
    ],
  }
);
