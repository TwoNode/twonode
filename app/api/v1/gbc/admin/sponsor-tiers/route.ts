import { NextResponse } from "next/server";
import { z } from "zod";
import { withAuth } from "@/lib/api/withAuth";
import { validateBody } from "@/lib/api/validate";
import { validateCSRF } from "@/lib/auth/csrf";
import { createSponsorTier, getSponsorTiersWithCounts } from "@/gbc/services/sponsorTierService";
import { Platform, GBCRole } from "@/utils/platform";

const createSchema = z.object({
  name: z.string(),
  description: z.string().nullable().optional(),
  size: z.string().optional(),
});

export const GET = withAuth<GBCRole>(
  async () => NextResponse.json({ success: true, data: await getSponsorTiersWithCounts() }),
  { platform: Platform.GBC, roles: [GBCRole.ADMIN, GBCRole.SUPERADMIN] }
);

export const POST = withAuth<GBCRole>(
  async (req, ctx) => {
    if (!validateCSRF(req)) {
      return NextResponse.json({ success: false, error: "Cross-origin request blocked" }, { status: 403 });
    }
    const input = await validateBody(req, createSchema);
    return NextResponse.json({ success: true, data: await createSponsorTier(input, ctx.session.sub) });
  },
  { platform: Platform.GBC, roles: [GBCRole.ADMIN, GBCRole.SUPERADMIN] }
);
