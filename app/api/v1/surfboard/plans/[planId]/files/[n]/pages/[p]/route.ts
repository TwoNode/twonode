import { NextResponse } from "next/server";
import { withAuth } from "@/lib/api/withAuth";
import { getProtectedPage } from "@/surfboard/services/protectedFileService";
import { Platform, SurfboardRole } from "@/utils/platform";

type RouteCtx = {
  params: Promise<{ planId: string; n: string; p: string }>;
};

// Drawing a page takes a moment and uses memory: give it room, and never run it at the edge.
export const runtime = "nodejs";
export const maxDuration = 30;

/**
 * GET /api/v1/surfboard/plans/{planId}/files/{n}/pages/{p} — page `p` (from 1) of a file of a plan
 * SHARED WITH THE CALLER, as a watermarked JPEG (`Draft_{SURCON No}` of the sharing surveyor is part
 * of the picture). The original file is never sent. `no-store`, so nothing keeps the picture; an
 * account may ask for a limited number of pages an hour (429 `RATE_LIMITED`).
 */
export const GET = withAuth<SurfboardRole>(
  async (_req, ctx, routeCtx: RouteCtx) => {
    const { planId, n, p } = await routeCtx.params;
    const jpeg = await getProtectedPage(ctx.session.sub, planId, n, p);
    return new NextResponse(new Uint8Array(jpeg), {
      status: 200,
      headers: {
        "Content-Type": "image/jpeg",
        "Content-Disposition": "inline",
        "Cache-Control": "private, no-store, max-age=0",
        "X-Content-Type-Options": "nosniff",
      },
    });
  },
  { platform: Platform.SURFBOARD, roles: [SurfboardRole.USER] }
);
