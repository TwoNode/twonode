import { NextRequest, NextResponse } from "next/server";
import { withAuth } from "@/lib/api/withAuth";
import { validateCSRF } from "@/lib/auth/csrf";
import { ValidationError } from "@/lib/api/errors";
import { getViewerAttachmentUploadUrl } from "@/surfboard/services/planViewerAttachmentService";
import { Platform, SurfboardRole } from "@/utils/platform";

type RouteCtx = { params: Promise<{ planId: string }> };

/** Step 1 of the direct-to-S3 upload flow — see viewer-attachments/route.ts for step 2. */
export const POST = withAuth<SurfboardRole>(
  async (req: NextRequest, ctx, routeCtx: RouteCtx) => {
    if (!validateCSRF(req)) {
      return NextResponse.json({ success: false, error: "Cross-origin request blocked" }, { status: 403 });
    }
    const { planId } = await routeCtx.params;
    const body = await req.json();
    const { fileName, contentType } = body || {};
    if (!fileName || !contentType) throw new ValidationError({ file: "Missing file name or type" });

    const data = await getViewerAttachmentUploadUrl(planId, ctx.session.sub, fileName, contentType);
    return NextResponse.json({ success: true, data });
  },
  { platform: Platform.SURFBOARD, roles: [SurfboardRole.USER] }
);
