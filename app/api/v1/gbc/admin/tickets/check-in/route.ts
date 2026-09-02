import { NextResponse } from "next/server";
import { z } from "zod";
import { withAuth } from "@/lib/api/withAuth";
import { validateBody } from "@/lib/api/validate";
import { validateCSRF } from "@/lib/auth/csrf";
import { checkInTicket, getAdminContact } from "@/gbc/services/ticketService";
import { Platform, GBCRole } from "@/utils/platform";

const bodySchema = z.object({ ticketNumber: z.string().min(1) });

export const POST = withAuth<GBCRole>(
  async (req, ctx) => {
    if (!validateCSRF(req)) {
      return NextResponse.json({ success: false, error: "Cross-origin request blocked" }, { status: 403 });
    }
    const { ticketNumber } = await validateBody(req, bodySchema);
    const admin = await getAdminContact(ctx.session.sub);
    const data = await checkInTicket(ticketNumber, admin.email);
    return NextResponse.json({ success: true, data });
  },
  { platform: Platform.GBC, roles: [GBCRole.ADMIN, GBCRole.SUPERADMIN] }
);
