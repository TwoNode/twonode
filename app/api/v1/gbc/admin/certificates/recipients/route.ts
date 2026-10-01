import { NextResponse } from "next/server";
import { withAuth } from "@/lib/api/withAuth";
import { getTicketNumbers } from "@/gbc/services/ticketService";
import { parseTicketListParams, toTicketFilters } from "@/gbc/utils/ticketListParams";
import { Platform, GBCRole } from "@/utils/platform";

/** Every COMPLETED ticket number matching the Certificates page's filters — powers "Select All" across pages. */
export const GET = withAuth<GBCRole>(
  async (req) => {
    const params = parseTicketListParams(Object.fromEntries(req.nextUrl.searchParams), { checkedIn: "yes" });
    const ticketNumbers = await getTicketNumbers({ ...toTicketFilters(params), status: "COMPLETED" });
    return NextResponse.json({ success: true, data: { ticketNumbers } });
  },
  { platform: Platform.GBC, roles: [GBCRole.ADMIN, GBCRole.SUPERADMIN] }
);
