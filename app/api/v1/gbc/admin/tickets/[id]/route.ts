import { NextResponse } from "next/server";
import { withAuth } from "@/lib/api/withAuth";
import { validateCSRF } from "@/lib/auth/csrf";
import { getTicketById, deleteTicket } from "@/gbc/services/ticketService";
import { Platform, GBCRole } from "@/utils/platform";

type RouteCtx = { params: Promise<{ id: string }> };

export const GET = withAuth<GBCRole>(
  async (_req, _ctx, routeCtx: RouteCtx) => {
    const { id } = await routeCtx.params;
    const data = await getTicketById(id);
    return NextResponse.json({ success: true, data });
  },
  { platform: Platform.GBC, roles: [GBCRole.ADMIN, GBCRole.SUPERADMIN] }
);

export const DELETE = withAuth<GBCRole>(
  async (req, _ctx, routeCtx: RouteCtx) => {
    if (!validateCSRF(req)) {
      return NextResponse.json({ success: false, error: "Cross-origin request blocked" }, { status: 403 });
    }
    const { id } = await routeCtx.params;
    await deleteTicket(id);
    return NextResponse.json({ success: true, message: "Ticket deleted successfully" });
  },
  { platform: Platform.GBC, roles: [GBCRole.ADMIN, GBCRole.SUPERADMIN] }
);
