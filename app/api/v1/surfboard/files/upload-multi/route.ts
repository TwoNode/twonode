import { NextResponse } from "next/server";
import { withAuth } from "@/lib/api/withAuth";
import { validateCSRF } from "@/lib/auth/csrf";
import { getSurfboardUploadTargetsMulti } from "@/surfboard/services/awsService";
import { Platform, SurfboardRole } from "@/utils/platform";

export const POST = withAuth<SurfboardRole>(
  async (req, ctx) => {
    if (!validateCSRF(req)) {
      return NextResponse.json({ success: false, error: "Cross-origin request blocked" }, { status: 403 });
    }
    const formData = await req.formData();
    const data = await getSurfboardUploadTargetsMulti(ctx.session.sub, formData);
    return NextResponse.json({ success: true, data });
  },
  { platform: Platform.SURFBOARD }
);
