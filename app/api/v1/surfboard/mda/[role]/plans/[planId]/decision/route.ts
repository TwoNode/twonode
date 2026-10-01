import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { withAuth } from "@/lib/api/withAuth";
import { validateBody } from "@/lib/api/validate";
import { validateCSRF } from "@/lib/auth/csrf";
import { ForbiddenError, ValidationError } from "@/lib/api/errors";
import { updateChartingStatus, updateIntakeStatus, updateRecordsIStatus, updateSurconStatus } from "@/surfboard/services/batchApprovalService";
import { Platform, SurfboardRole } from "@/utils/platform";

type RouteCtx = { params: Promise<{ role: string; planId: string }> };

/**
 * Charting/SURCON/Records I/Intake decisions share one shape:
 * {approved, comment?}. Charting keeps its historical APPROVE/QUERY mode
 * string internally (updateChartingStatus's own signature), translated
 * from the shared boolean here rather than exposing that inconsistency
 * to the API surface.
 */
const bodySchema = z.object({ approved: z.boolean(), comment: z.string().optional() });

const ROLE_MAP: Record<string, { role: SurfboardRole; decide: (userId: string, planId: string, approved: boolean, comment?: string) => Promise<any> }> = {
  charting: { role: SurfboardRole.CHARTING, decide: (userId, planId, approved, comment) => updateChartingStatus(userId, planId, approved ? "APPROVE" : "QUERY", comment) },
  surcon: { role: SurfboardRole.SURCON, decide: updateSurconStatus },
  "records-i": { role: SurfboardRole.RECORDS_I, decide: updateRecordsIStatus },
  intake: { role: SurfboardRole.INTAKE, decide: updateIntakeStatus },
};

export const POST = withAuth<SurfboardRole>(
  async (req: NextRequest, ctx, routeCtx: RouteCtx) => {
    if (!validateCSRF(req)) {
      return NextResponse.json({ success: false, error: "Cross-origin request blocked" }, { status: 403 });
    }
    const { role, planId } = await routeCtx.params;
    const entry = ROLE_MAP[role];
    if (!entry) throw new ValidationError({ role: `Unknown MDA role "${role}"` });
    if (ctx.session.role !== entry.role && ctx.session.role !== SurfboardRole.SUPERADMIN) {
      throw new ForbiddenError();
    }

    const { approved, comment } = await validateBody(req, bodySchema);
    const data = await entry.decide(ctx.session.sub, planId, approved, comment);
    return NextResponse.json({ success: true, data });
  },
  { platform: Platform.SURFBOARD, roles: [SurfboardRole.CHARTING, SurfboardRole.SURCON, SurfboardRole.RECORDS_I, SurfboardRole.INTAKE, SurfboardRole.SUPERADMIN] }
);
