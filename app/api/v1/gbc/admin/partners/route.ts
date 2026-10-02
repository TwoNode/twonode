import { NextResponse } from "next/server";
import { withAuth } from "@/lib/api/withAuth";
import { validateBody } from "@/lib/api/validate";
import { validateCSRF } from "@/lib/auth/csrf";
import { partnerSchema } from "@/gbc/utils/validations";
import { createPartner } from "@/gbc/services/cmsService";
import { Platform, GBCRole } from "@/utils/platform";

/** No admin-list route — matches the source, which has no admin-all variant for partners either. */
export const POST = withAuth<GBCRole>(
  async (req) => {
    if (!validateCSRF(req)) {
      return NextResponse.json(
        { success: false, error: "Cross-origin request blocked" },
        { status: 403 }
      );
    }
    const data = await validateBody(req, partnerSchema);
    const partner = await createPartner(data);
    return NextResponse.json({ success: true, data: partner });
  },
  { platform: Platform.GBC, roles: [GBCRole.ADMIN, GBCRole.SUPERADMIN] }
);
