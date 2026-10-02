import { NextRequest, NextResponse } from "next/server";
import { withAuth } from "@/lib/api/withAuth";
import { validateCSRF } from "@/lib/auth/csrf";
import { deletePlanComment } from "@/surfboard/services/planCommentService";
import { Platform, SurfboardRole } from "@/utils/platform";

type RouteCtx = { params: Promise<{ planId: string; commentId: string }> };

export const DELETE = withAuth<SurfboardRole>(
  async (req: NextRequest, ctx, routeCtx: RouteCtx) => {
    if (!validateCSRF(req)) {
      return NextResponse.json(
        { success: false, error: "Cross-origin request blocked" },
        { status: 403 }
      );
    }
    const { commentId } = await routeCtx.params;
    await deletePlanComment(ctx.session.sub, commentId);
    return NextResponse.json({ success: true, data: { id: commentId } });
  },
  { platform: Platform.SURFBOARD, roles: [SurfboardRole.USER] }
);
