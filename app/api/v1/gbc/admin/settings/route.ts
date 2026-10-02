import { NextResponse } from "next/server";
import { z } from "zod";
import { withAuth } from "@/lib/api/withAuth";
import { validateBody } from "@/lib/api/validate";
import { validateCSRF } from "@/lib/auth/csrf";
import { updateSettings } from "@/gbc/services/settingsService";
import { Platform, GBCRole } from "@/utils/platform";

const patchSchema = z
  .object({
    event: z.record(z.string(), z.any()),
    contact: z.record(z.string(), z.any()),
    tickets: z.record(z.string(), z.any()),
    notifications: z.record(z.string(), z.any()),
    gallery: z.record(z.string(), z.any()),
    system: z.record(z.string(), z.any()),
  })
  .partial();

export const PATCH = withAuth<GBCRole>(
  async (req, ctx) => {
    if (!validateCSRF(req)) {
      return NextResponse.json(
        { success: false, error: "Cross-origin request blocked" },
        { status: 403 }
      );
    }
    const patch = await validateBody(req, patchSchema);
    const data = await updateSettings(
      patch,
      ctx.session.sub,
      req.nextUrl.searchParams.get("edition") || undefined
    );
    return NextResponse.json({ success: true, data });
  },
  { platform: Platform.GBC, roles: [GBCRole.ADMIN, GBCRole.SUPERADMIN] }
);
