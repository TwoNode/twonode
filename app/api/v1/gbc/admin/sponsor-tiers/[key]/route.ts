import { NextResponse } from "next/server";
import { z } from "zod";
import { withAuth } from "@/lib/api/withAuth";
import { validateBody } from "@/lib/api/validate";
import { validateCSRF } from "@/lib/auth/csrf";
import { deleteSponsorTier, updateSponsorTier } from "@/gbc/services/sponsorTierService";
import { Platform, GBCRole } from "@/utils/platform";

type RouteCtx = { params: Promise<{ key: string }> };

const patchSchema = z.object({
  name: z.string().optional(),
  description: z.string().nullable().optional(),
  size: z.string().optional(),
});

export const PATCH = withAuth<GBCRole>(
  async (req, ctx, routeCtx: RouteCtx) => {
    if (!validateCSRF(req)) {
      return NextResponse.json({ success: false, error: "Cross-origin request blocked" }, { status: 403 });
    }
    const { key } = await routeCtx.params;
    const patch = await validateBody(req, patchSchema);
    return NextResponse.json({ success: true, data: await updateSponsorTier(key, patch, ctx.session.sub) });
  },
  { platform: Platform.GBC, roles: [GBCRole.ADMIN, GBCRole.SUPERADMIN] }
);

export const DELETE = withAuth<GBCRole>(
  async (req, ctx, routeCtx: RouteCtx) => {
    if (!validateCSRF(req)) {
      return NextResponse.json({ success: false, error: "Cross-origin request blocked" }, { status: 403 });
    }
    const { key } = await routeCtx.params;
    await deleteSponsorTier(key, ctx.session.sub);
    return NextResponse.json({ success: true, message: "Tier deleted" });
  },
  { platform: Platform.GBC, roles: [GBCRole.ADMIN, GBCRole.SUPERADMIN] }
);
