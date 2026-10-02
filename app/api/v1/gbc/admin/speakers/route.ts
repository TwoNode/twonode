import { NextResponse } from "next/server";
import { withAuth } from "@/lib/api/withAuth";
import { validateBody } from "@/lib/api/validate";
import { validateCSRF } from "@/lib/auth/csrf";
import { speakerSchema } from "@/gbc/utils/validations";
import { getAllSpeakers, createSpeaker } from "@/gbc/services/cmsService";
import { Platform, GBCRole } from "@/utils/platform";

export const GET = withAuth<GBCRole>(
  async (req) => {
    const edition = req.nextUrl.searchParams.get("edition") ?? undefined;
    const data = await getAllSpeakers(edition);
    return NextResponse.json({ success: true, data });
  },
  { platform: Platform.GBC, roles: [GBCRole.ADMIN, GBCRole.SUPERADMIN] }
);

export const POST = withAuth<GBCRole>(
  async (req) => {
    if (!validateCSRF(req)) {
      return NextResponse.json(
        { success: false, error: "Cross-origin request blocked" },
        { status: 403 }
      );
    }
    const data = await validateBody(req, speakerSchema);
    const speaker = await createSpeaker(data);
    return NextResponse.json({ success: true, data: speaker });
  },
  { platform: Platform.GBC, roles: [GBCRole.ADMIN, GBCRole.SUPERADMIN] }
);
