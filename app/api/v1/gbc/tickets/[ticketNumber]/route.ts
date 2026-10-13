import { NextResponse } from "next/server";
import { withAuth } from "@/lib/api/withAuth";
import { getTicketByNumber } from "@/gbc/services/ticketService";
import { Platform, GBCRole } from "@/utils/platform";

type RouteCtx = { params: Promise<{ ticketNumber: string }> };

/**
 * GBC staff only. It used to be public, which returned a ticket's name, email,
 * phone and QR link to anyone who typed a ticket number (I-028). The
 * certificate page reads the ticket through the service, not through this
 * route.
 */
export const GET = withAuth<GBCRole>(
  async (_req, _ctx, routeCtx: RouteCtx) => {
    const { ticketNumber } = await routeCtx.params;
    const data = await getTicketByNumber(ticketNumber);
    return NextResponse.json({ success: true, data });
  },
  { platform: Platform.GBC, roles: [GBCRole.ADMIN, GBCRole.SUPERADMIN] }
);
