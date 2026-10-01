import { NextResponse } from "next/server";
import { withAuth } from "@/lib/api/withAuth";
import { validateCSRF } from "@/lib/auth/csrf";
import { getProfile, updateProfile } from "@/surfboard/services/profileService";
import { Platform, SurfboardRole } from "@/utils/platform";

export const GET = withAuth<SurfboardRole>(
  async (_req, ctx) => {
    const data = await getProfile(ctx.session.sub);
    return NextResponse.json({ success: true, data });
  },
  { platform: Platform.SURFBOARD }
);

export const PATCH = withAuth<SurfboardRole>(
  async (req, ctx) => {
    if (!validateCSRF(req)) {
      return NextResponse.json({ success: false, error: "Cross-origin request blocked" }, { status: 403 });
    }
    const formData = await req.formData();
    const data = await updateProfile(ctx.session.sub, formData);
    return NextResponse.json({ success: true, data });
  },
  { platform: Platform.SURFBOARD }
);
