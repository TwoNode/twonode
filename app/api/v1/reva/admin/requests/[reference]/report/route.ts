import { NextResponse } from "next/server";
import { withAuth } from "@/lib/api/withAuth";
import { validateCSRF } from "@/lib/auth/csrf";
import { getUserContact } from "@/reva/services/propertyRequestService";
import { uploadDueDiligenceReport, uploadDirectLinkReport } from "@/reva/services/reportService";
import { Platform, RevaRole } from "@/utils/platform";

type RouteCtx = { params: Promise<{ reference: string }> };

/**
 * One route, two upload paths, mirroring the source's two separate
 * functions — dispatched on whether the multipart body carries a
 * `directLink` file (uploadDirectLinkReport) or the structured
 * due-diligence fields (uploadDueDiligenceReport).
 */
export const POST = withAuth<RevaRole>(
  async (req, ctx, routeCtx: RouteCtx) => {
    if (!validateCSRF(req)) {
      return NextResponse.json({ success: false, error: "Cross-origin request blocked" }, { status: 403 });
    }
    const { reference } = await routeCtx.params;
    const admin = await getUserContact(ctx.session.sub);
    const formData = await req.formData();
    formData.set("reference", reference);

    const data = formData.get("directLink") instanceof File
      ? await uploadDirectLinkReport(formData, admin.email)
      : await uploadDueDiligenceReport(formData, admin.email);

    return NextResponse.json({ success: true, ...data });
  },
  { platform: Platform.REVA, roles: [RevaRole.ADMIN, RevaRole.SUPERADMIN] }
);
