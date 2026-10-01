import { NextResponse } from "next/server";
import { withAuth } from "@/lib/api/withAuth";
import { exportTickets } from "@/gbc/services/ticketService";
import { Platform, GBCRole } from "@/utils/platform";

export const GET = withAuth<GBCRole>(
  async () => {
    const data = await exportTickets();
    return NextResponse.json({ success: true, data });
  },
  { platform: Platform.GBC, roles: [GBCRole.ADMIN, GBCRole.SUPERADMIN] }
);
