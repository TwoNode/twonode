import { NextResponse } from "next/server";
import { withAuth } from "@/lib/api/withAuth";
import { validateCSRF } from "@/lib/auth/csrf";
import { resetToDefaults } from "@/gbc/services/settingsService";
import { Platform, GBCRole } from "@/utils/platform";

export const POST = withAuth<GBCRole>(
  async (req, ctx) => {
    if (!validateCSRF(req)) {
      return NextResponse.json({ success: false, error: "Cross-origin request blocked" }, { status: 403 });
    }
    const data = await resetToDefaults(ctx.session.sub);
    return NextResponse.json({ success: true, data, message: "Successfully reset settings to defaults" });
  },
  { platform: Platform.GBC, roles: [GBCRole.SUPERADMIN] }
);
