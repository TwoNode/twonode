import { NextResponse } from "next/server";
import { withAuth } from "@/lib/api/withAuth";
import { validateBody } from "@/lib/api/validate";
import { validateCSRF } from "@/lib/auth/csrf";
import { sponsorSchema } from "@/gbc/utils/validations";
import { getAllSponsors, createSponsor } from "@/gbc/services/cmsService";
import { Platform, GBCRole } from "@/utils/platform";

export const GET = withAuth<GBCRole>(
  async (req) => {
    const edition = req.nextUrl.searchParams.get("edition") ?? undefined;
    const data = await getAllSponsors(edition);
    return NextResponse.json({ success: true, data });
  },
  { platform: Platform.GBC, roles: [GBCRole.ADMIN, GBCRole.SUPERADMIN] }
);

export const POST = withAuth<GBCRole>(
  async (req) => {
    if (!validateCSRF(req)) {
      return NextResponse.json({ success: false, error: "Cross-origin request blocked" }, { status: 403 });
    }
    const data = await validateBody(req, sponsorSchema);
    const sponsor = await createSponsor(data);
    return NextResponse.json({ success: true, data: sponsor });
  },
  { platform: Platform.GBC, roles: [GBCRole.ADMIN, GBCRole.SUPERADMIN] }
);
