import { NextResponse } from "next/server";
import { withAuth } from "@/lib/api/withAuth";
import { validateCSRF } from "@/lib/auth/csrf";
import { generateTicketQRCode } from "@/gbc/services/ticketService";
import { Platform, GBCRole } from "@/utils/platform";

type RouteCtx = { params: Promise<{ id: string }> };

export const POST = withAuth<GBCRole>(
  async (req, _ctx, routeCtx: RouteCtx) => {
    if (!validateCSRF(req)) {
      return NextResponse.json({ success: false, error: "Cross-origin request blocked" }, { status: 403 });
    }
    const { id } = await routeCtx.params;
    const data = await generateTicketQRCode(id);
    return NextResponse.json({ success: true, data });
  },
  { platform: Platform.GBC, roles: [GBCRole.ADMIN, GBCRole.SUPERADMIN] }
);
