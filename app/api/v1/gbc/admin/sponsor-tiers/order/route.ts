import { NextResponse } from "next/server";
import { z } from "zod";
import { withAuth } from "@/lib/api/withAuth";
import { validateBody } from "@/lib/api/validate";
import { validateCSRF } from "@/lib/auth/csrf";
import { reorderSponsorTiers } from "@/gbc/services/sponsorTierService";
import { Platform, GBCRole } from "@/utils/platform";

const schema = z.object({ keys: z.array(z.string()).min(1) });

/** PUT { keys: [...] } — the tiers in the order they should appear on the public page. */
export const PUT = withAuth<GBCRole>(
  async (req, ctx) => {
    if (!validateCSRF(req)) {
      return NextResponse.json({ success: false, error: "Cross-origin request blocked" }, { status: 403 });
    }
    const { keys } = await validateBody(req, schema);
    return NextResponse.json({ success: true, data: await reorderSponsorTiers(keys, ctx.session.sub) });
  },
  { platform: Platform.GBC, roles: [GBCRole.ADMIN, GBCRole.SUPERADMIN] }
);
