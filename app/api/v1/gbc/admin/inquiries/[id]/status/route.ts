import { NextResponse } from "next/server";
import { z } from "zod";
import { withAuth } from "@/lib/api/withAuth";
import { validateBody } from "@/lib/api/validate";
import { validateCSRF } from "@/lib/auth/csrf";
import { updateInquiryStatus } from "@/gbc/services/contactService";
import { Platform, GBCRole } from "@/utils/platform";

type RouteCtx = { params: Promise<{ id: string }> };
const bodySchema = z.object({ status: z.enum(["PENDING", "IN_PROGRESS", "RESOLVED", "CLOSED"]) });

export const PATCH = withAuth<GBCRole>(
  async (req, _ctx, routeCtx: RouteCtx) => {
    if (!validateCSRF(req)) {
      return NextResponse.json({ success: false, error: "Cross-origin request blocked" }, { status: 403 });
    }
    const { id } = await routeCtx.params;
    const { status } = await validateBody(req, bodySchema);
    const inquiry = await updateInquiryStatus(id, status);
    return NextResponse.json({ success: true, data: inquiry });
  },
  { platform: Platform.GBC, roles: [GBCRole.ADMIN, GBCRole.SUPERADMIN] }
);
