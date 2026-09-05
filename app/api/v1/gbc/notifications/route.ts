import { NextResponse } from "next/server";
import { z } from "zod";
import { withAuth } from "@/lib/api/withAuth";
import { validateBody } from "@/lib/api/validate";
import { validateCSRF } from "@/lib/auth/csrf";
import { getAdminNotifications, createGBCNotification } from "@/gbc/services/notificationService";
import { Platform, GBCRole } from "@/utils/platform";

export const GET = withAuth<GBCRole>(
  async (req, ctx) => {
    const { searchParams } = new URL(req.url);
    const includeRead = searchParams.get("includeRead") !== "false";
    const includeDismissed = searchParams.get("includeDismissed") === "true";
    const limit = searchParams.get("limit") ? Number(searchParams.get("limit")) : undefined;

    const data = await getAdminNotifications(ctx.session.sub, ctx.session.role as "ADMIN" | "SUPERADMIN", {
      includeRead,
      includeDismissed,
      limit,
    });
    return NextResponse.json({ success: true, data });
  },
  { platform: Platform.GBC, roles: [GBCRole.ADMIN, GBCRole.SUPERADMIN] }
);

const createSchema = z.object({
  type: z.enum(["INFO", "SUCCESS", "WARNING", "ERROR", "SYSTEM"]),
  title: z.string().min(1),
  message: z.string().min(1),
  audience: z.enum(["SPECIFIC_USERS", "GENERAL_ADMINS", "SUPERADMIN", "ALL_USERS"]),
  userIds: z.array(z.string()).optional(),
  link: z.string().optional(),
  metadata: z.any().optional(),
});

export const POST = withAuth<GBCRole>(
  async (req) => {
    if (!validateCSRF(req)) {
      return NextResponse.json({ success: false, error: "Cross-origin request blocked" }, { status: 403 });
    }
    const body = await validateBody(req, createSchema);
    const data = await createGBCNotification(body);
    return NextResponse.json({ success: true, data });
  },
  { platform: Platform.GBC, roles: [GBCRole.ADMIN, GBCRole.SUPERADMIN] }
);
