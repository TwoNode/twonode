import { NextRequest, NextResponse } from "next/server";
import { withAuth } from "@/lib/api/withAuth";
import { validateCSRF } from "@/lib/auth/csrf";
import { deleteViewerAttachment } from "@/surfboard/services/planViewerAttachmentService";
import { Platform, SurfboardRole } from "@/utils/platform";

type RouteCtx = { params: Promise<{ planId: string; attachmentId: string }> };

export const DELETE = withAuth<SurfboardRole>(
  async (req: NextRequest, ctx, routeCtx: RouteCtx) => {
    if (!validateCSRF(req)) {
      return NextResponse.json(
        { success: false, error: "Cross-origin request blocked" },
        { status: 403 }
      );
    }
    const { attachmentId } = await routeCtx.params;
    await deleteViewerAttachment(ctx.session.sub, attachmentId);
    return NextResponse.json({ success: true, data: { id: attachmentId } });
  },
  { platform: Platform.SURFBOARD, roles: [SurfboardRole.USER] }
);
