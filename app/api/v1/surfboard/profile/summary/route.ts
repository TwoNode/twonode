import { NextResponse } from "next/server";
import { withAuth } from "@/lib/api/withAuth";
import { getProfileSummary } from "@/surfboard/services/profileService";
import { Platform, SurfboardRole } from "@/utils/platform";

/**
 * GET /api/v1/surfboard/profile/summary — the profile the mobile app shows
 * (TASK-0015 1F.5): name, firm, SURCON registration and state. No logo or
 * signature link, payer id, phone or address (`GET profile` sends those).
 */
export const GET = withAuth<SurfboardRole>(
  async (_req, ctx) => {
    const data = await getProfileSummary(ctx.session.sub);
    return NextResponse.json({ success: true, data });
  },
  { platform: Platform.SURFBOARD, roles: [SurfboardRole.USER] }
);
