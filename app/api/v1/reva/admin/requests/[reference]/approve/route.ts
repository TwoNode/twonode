import { NextResponse } from "next/server";
import { z } from "zod";
import { withAuth } from "@/lib/api/withAuth";
import { validateBody } from "@/lib/api/validate";
import { validateCSRF } from "@/lib/auth/csrf";
import { getUserContact } from "@/reva/services/propertyRequestService";
import {
  getAnyRequestByReferenceForAdmin,
  approveDueDiligenceReport,
  approveOneTimeDueDiligenceReport,
} from "@/reva/services/reportService";
import { Platform, RevaRole } from "@/utils/platform";

type RouteCtx = { params: Promise<{ reference: string }> };

/** `comment` accepted for forward compatibility but not persisted — the source's approve functions never took one either. */
const approveSchema = z.object({ isApproved: z.boolean(), comment: z.string().optional() });

export const POST = withAuth<RevaRole>(
  async (req, ctx, routeCtx: RouteCtx) => {
    if (!validateCSRF(req)) {
      return NextResponse.json({ success: false, error: "Cross-origin request blocked" }, { status: 403 });
    }
    const { reference } = await routeCtx.params;
    const { isApproved } = await validateBody(req, approveSchema);
    const admin = await getUserContact(ctx.session.sub);

    const existing = await getAnyRequestByReferenceForAdmin(reference);
    const data =
      existing.type === "property"
        ? await approveDueDiligenceReport(reference, isApproved, admin.email, ctx.session.sub)
        : await approveOneTimeDueDiligenceReport(reference, isApproved, admin.email, ctx.session.sub);

    return NextResponse.json({ success: true, ...data });
  },
  // SUPERADMIN only — matches the "Approve Report" button, which only ever
  // renders for viewerRole === "SUPERADMIN" (AdminReportUpload.tsx /
  // AdminDirectLinkUpload.tsx). Previously also allowed ADMIN here despite
  // the UI hiding the button from them, a live gap: a plain ADMIN could
  // still call this endpoint directly.
  { platform: Platform.REVA, roles: [RevaRole.SUPERADMIN] }
);
