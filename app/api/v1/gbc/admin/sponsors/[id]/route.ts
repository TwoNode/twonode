import { NextResponse } from "next/server";
import { z } from "zod";
import { withAuth } from "@/lib/api/withAuth";
import { validateBody } from "@/lib/api/validate";
import { validateCSRF } from "@/lib/auth/csrf";
import { sponsorSchema } from "@/gbc/utils/validations";
import { updateSponsor, deleteSponsor } from "@/gbc/services/cmsService";
import { Platform, GBCRole } from "@/utils/platform";

type RouteCtx = { params: Promise<{ id: string }> };
const patchSchema = sponsorSchema
  .partial()
  .extend({ newLogoS3Key: z.string().optional() });

export const PATCH = withAuth<GBCRole>(
  async (req, _ctx, routeCtx: RouteCtx) => {
    if (!validateCSRF(req)) {
      return NextResponse.json(
        { success: false, error: "Cross-origin request blocked" },
        { status: 403 }
      );
    }
    const { id } = await routeCtx.params;
    const { newLogoS3Key, ...data } = await validateBody(req, patchSchema);
    const sponsor = await updateSponsor(id, data as any, newLogoS3Key);
    return NextResponse.json({ success: true, data: sponsor });
  },
  { platform: Platform.GBC, roles: [GBCRole.ADMIN, GBCRole.SUPERADMIN] }
);

export const DELETE = withAuth<GBCRole>(
  async (req, _ctx, routeCtx: RouteCtx) => {
    if (!validateCSRF(req)) {
      return NextResponse.json(
        { success: false, error: "Cross-origin request blocked" },
        { status: 403 }
      );
    }
    const { id } = await routeCtx.params;
    await deleteSponsor(id);
    return NextResponse.json({
      success: true,
      message: "Sponsor deleted successfully",
    });
  },
  { platform: Platform.GBC, roles: [GBCRole.ADMIN, GBCRole.SUPERADMIN] }
);
