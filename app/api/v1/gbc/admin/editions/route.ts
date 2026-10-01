import { NextResponse } from "next/server";
import { z } from "zod";
import { withAuth } from "@/lib/api/withAuth";
import { validateBody } from "@/lib/api/validate";
import { validateCSRF } from "@/lib/auth/csrf";
import { createEdition } from "@/gbc/services/editionService";
import { Platform, GBCRole } from "@/utils/platform";

const bodySchema = z.object({
  key: z.string().min(1),
  name: z.string().min(1),
  theme: z.string().min(1),
  subTheme: z.string().min(1),
  venue: z.string().min(1),
  startDate: z.string().min(1),
  endDate: z.string().min(1),
  ticketPrefix: z.string().min(1),
  status: z.enum(["UPCOMING", "ACTIVE", "PAST"]).optional(),
});

export const POST = withAuth<GBCRole>(
  async (req, ctx) => {
    if (!validateCSRF(req)) {
      return NextResponse.json({ success: false, error: "Cross-origin request blocked" }, { status: 403 });
    }
    const data = await validateBody(req, bodySchema);
    const editions = await createEdition(data, ctx.session.sub);
    return NextResponse.json({ success: true, data: editions });
  },
  { platform: Platform.GBC, roles: [GBCRole.SUPERADMIN] }
);
