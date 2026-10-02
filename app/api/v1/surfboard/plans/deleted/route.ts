import { NextResponse } from "next/server";
import { withAuth } from "@/lib/api/withAuth";
import { getDeletedSurfPlans } from "@/surfboard/services/planService";
import { Platform, SurfboardRole } from "@/utils/platform";

export const GET = withAuth<SurfboardRole>(
  async (req, ctx) => {
    const sp = req.nextUrl.searchParams;
    const page = sp.get("page") ? Number(sp.get("page")) : undefined;
    const pageSize = sp.get("pageSize")
      ? Number(sp.get("pageSize"))
      : undefined;
    const data = await getDeletedSurfPlans(ctx.session.sub, { page, pageSize });
    return NextResponse.json({ success: true, data });
  },
  { platform: Platform.SURFBOARD, roles: [SurfboardRole.USER] }
);
