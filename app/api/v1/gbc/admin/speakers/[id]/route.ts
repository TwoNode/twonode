import { NextResponse } from "next/server";
import { withAuth } from "@/lib/api/withAuth";
import { validateBody } from "@/lib/api/validate";
import { validateCSRF } from "@/lib/auth/csrf";
import { speakerSchema } from "@/app/(projects)/(GBC)/utils/validations";
import { updateSpeaker, deleteSpeaker } from "@/gbc/services/cmsService";
import { Platform, GBCRole } from "@/utils/platform";

type RouteCtx = { params: Promise<{ id: string }> };
const patchSchema = speakerSchema.partial();

export const PATCH = withAuth<GBCRole>(
  async (req, _ctx, routeCtx: RouteCtx) => {
    if (!validateCSRF(req)) {
      return NextResponse.json({ success: false, error: "Cross-origin request blocked" }, { status: 403 });
    }
    const { id } = await routeCtx.params;
    const data = await validateBody(req, patchSchema);
    const speaker = await updateSpeaker(id, data as any);
    return NextResponse.json({ success: true, data: speaker });
  },
  { platform: Platform.GBC, roles: [GBCRole.ADMIN, GBCRole.SUPERADMIN] }
);

export const DELETE = withAuth<GBCRole>(
  async (req, _ctx, routeCtx: RouteCtx) => {
    if (!validateCSRF(req)) {
      return NextResponse.json({ success: false, error: "Cross-origin request blocked" }, { status: 403 });
    }
    const { id } = await routeCtx.params;
    await deleteSpeaker(id);
    return NextResponse.json({ success: true, message: "Speaker deleted successfully" });
  },
  { platform: Platform.GBC, roles: [GBCRole.ADMIN, GBCRole.SUPERADMIN] }
);
