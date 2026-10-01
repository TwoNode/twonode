import { NextResponse } from "next/server";
import { z } from "zod";
import { withAuth } from "@/lib/api/withAuth";
import { validateBody } from "@/lib/api/validate";
import { validateCSRF } from "@/lib/auth/csrf";
import { sendBulkCertificates } from "@/gbc/services/certificateService";
import { Platform, GBCRole } from "@/utils/platform";

const bodySchema = z.object({ ticketNumbers: z.array(z.string().min(1)).min(1), emailBody: z.string() });

export const POST = withAuth<GBCRole>(
  async (req) => {
    if (!validateCSRF(req)) {
      return NextResponse.json({ success: false, error: "Cross-origin request blocked" }, { status: 403 });
    }
    const { ticketNumbers, emailBody } = await validateBody(req, bodySchema);
    const data = await sendBulkCertificates(ticketNumbers, emailBody);
    return NextResponse.json({ success: true, data });
  },
  { platform: Platform.GBC, roles: [GBCRole.ADMIN, GBCRole.SUPERADMIN] }
);
