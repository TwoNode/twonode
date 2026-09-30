import { NextRequest, NextResponse } from "next/server";
import { withAuth } from "@/lib/api/withAuth";
import { validateCSRF } from "@/lib/auth/csrf";
import { ValidationError } from "@/lib/api/errors";
import { finalizeViewerAttachment, getViewerAttachments } from "@/surfboard/services/planViewerAttachmentService";
import { Platform, SurfboardRole } from "@/utils/platform";

type RouteCtx = { params: Promise<{ planId: string }> };

/** Lists the caller's OWN private attachments on this shared plan — never another viewer's or the owner's. */
export const GET = withAuth<SurfboardRole>(
  async (_req: NextRequest, ctx, routeCtx: RouteCtx) => {
    const { planId } = await routeCtx.params;
    const data = await getViewerAttachments(planId, ctx.session.sub);
    return NextResponse.json({ success: true, data });
  },
  { platform: Platform.SURFBOARD, roles: [SurfboardRole.USER] }
);

/**
 * Step 2 of the direct-to-S3 upload flow (see presign/route.ts for step 1):
 * the browser has already PUT the file straight to S3 — this just records
 * it. JSON body, not multipart, since no file bytes pass through here.
 */
export const POST = withAuth<SurfboardRole>(
  async (req: NextRequest, ctx, routeCtx: RouteCtx) => {
    if (!validateCSRF(req)) {
      return NextResponse.json({ success: false, error: "Cross-origin request blocked" }, { status: 403 });
    }
    const { planId } = await routeCtx.params;
    const body = await req.json();
    const { fileName, key, fileUrl } = body || {};
    if (!fileName || !key || !fileUrl) throw new ValidationError({ file: "Missing file metadata" });

    const data = await finalizeViewerAttachment(planId, ctx.session.sub, fileName, key, fileUrl);
    return NextResponse.json({ success: true, data });
  },
  { platform: Platform.SURFBOARD, roles: [SurfboardRole.USER] }
);
