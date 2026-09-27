import { NextResponse } from "next/server";
import { withAuth } from "@/lib/api/withAuth";
import { getSharedAwaitingResponseCount } from "@/surfboard/services/planService";
import { Platform, SurfboardRole } from "@/utils/platform";

export const GET = withAuth<SurfboardRole>(
  async (_req, { session }) => {
    const count = await getSharedAwaitingResponseCount(session.sub);
    return NextResponse.json({ success: true, data: { count } });
  },
  { platform: Platform.SURFBOARD, roles: [SurfboardRole.USER] }
);
