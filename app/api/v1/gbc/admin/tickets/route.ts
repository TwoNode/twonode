import { NextResponse } from "next/server";
import { withAuth } from "@/lib/api/withAuth";
import { getTickets } from "@/gbc/services/ticketService";
import { Platform, GBCRole } from "@/utils/platform";

export const GET = withAuth<GBCRole>(
  async (req) => {
    const status = req.nextUrl.searchParams.get("status") ?? undefined;
    const search = req.nextUrl.searchParams.get("search") ?? undefined;
    const limitParam = req.nextUrl.searchParams.get("limit");
    const data = await getTickets({
      status,
      search,
      limit: limitParam ? Number(limitParam) : undefined,
    });
    return NextResponse.json({ success: true, data });
  },
  { platform: Platform.GBC, roles: [GBCRole.ADMIN, GBCRole.SUPERADMIN] }
);
