import { NextRequest, NextResponse } from "next/server";
import { withAuth } from "@/lib/api/withAuth";
import { validateCSRF } from "@/lib/auth/csrf";
import { ValidationError } from "@/lib/api/errors";
import { addViewerAttachment, getViewerAttachments } from "@/surfboard/services/planViewerAttachmentService";
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

/** multipart/form-data — the attachment file itself, not a JSON body. */
export const POST = withAuth<SurfboardRole>(
  async (req: NextRequest, ctx, routeCtx: RouteCtx) => {
    if (!validateCSRF(req)) {
      return NextResponse.json({ success: false, error: "Cross-origin request blocked" }, { status: 403 });
    }
    const { planId } = await routeCtx.params;
    const form = await req.formData();
    const file = form.get("file");
    if (!(file instanceof File)) throw new ValidationError({ file: "Missing file" });

    const data = await addViewerAttachment(planId, ctx.session.sub, file);
    return NextResponse.json({ success: true, data });
  },
  { platform: Platform.SURFBOARD, roles: [SurfboardRole.USER] }
);
