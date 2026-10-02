import { NextResponse } from "next/server";
import { z } from "zod";
import { withAuth } from "@/lib/api/withAuth";
import { validateBody } from "@/lib/api/validate";
import { validateCSRF } from "@/lib/auth/csrf";
import { updateEdition } from "@/gbc/services/editionService";
import { Platform, GBCRole } from "@/utils/platform";

type RouteCtx = { params: Promise<{ key: string }> };

const bodySchema = z.object({
  name: z.string().min(1).optional(),
  theme: z.string().min(1).optional(),
  subTheme: z.string().min(1).optional(),
  venue: z.string().min(1).optional(),
  startDate: z.string().min(1).optional(),
  endDate: z.string().min(1).optional(),
  ticketPrefix: z.string().min(1).optional(),
});

export const PATCH = withAuth<GBCRole>(
  async (req, ctx, routeCtx: RouteCtx) => {
    if (!validateCSRF(req)) {
      return NextResponse.json(
        { success: false, error: "Cross-origin request blocked" },
        { status: 403 }
      );
    }
    const { key } = await routeCtx.params;
    const data = await validateBody(req, bodySchema);
    const editions = await updateEdition(key, data, ctx.session.sub);
    return NextResponse.json({ success: true, data: editions });
  },
  { platform: Platform.GBC, roles: [GBCRole.SUPERADMIN] }
);
