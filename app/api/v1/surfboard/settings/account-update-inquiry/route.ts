import { NextResponse } from "next/server";
import { z } from "zod";
import { withAuth } from "@/lib/api/withAuth";
import { validateBody } from "@/lib/api/validate";
import { validateCSRF } from "@/lib/auth/csrf";
import { sendAccountUpdateInquiry } from "@/surfboard/services/settingsService";
import { Platform, SurfboardRole } from "@/utils/platform";

const schema = z.object({ details: z.string().min(1) });

export const POST = withAuth<SurfboardRole>(
  async (req, ctx) => {
    if (!validateCSRF(req)) {
      return NextResponse.json(
        { success: false, error: "Cross-origin request blocked" },
        { status: 403 }
      );
    }
    const { details } = await validateBody(req, schema);
    const data = await sendAccountUpdateInquiry(ctx.session.sub, details);
    return NextResponse.json({ success: true, data });
  },
  { platform: Platform.SURFBOARD }
);
