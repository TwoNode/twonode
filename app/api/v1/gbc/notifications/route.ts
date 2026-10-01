import { NextResponse } from "next/server";
import { z } from "zod";
import { withAuth } from "@/lib/api/withAuth";
import { validateBody } from "@/lib/api/validate";
import { validateCSRF } from "@/lib/auth/csrf";
import { parsePagination } from "@/lib/api/pagination";
import { getAdminNotifications, getAdminNotificationsPaginated, createGBCNotification } from "@/gbc/services/notificationService";
import { Platform, GBCRole } from "@/utils/platform";
import type { GBCUserNotificationType } from "@/prisma/generated";

/** Opt-in: `?page=` switches to the paginated/searchable variant (the admin Notifications page) — omitting it keeps the original plain-array shape. */
export const GET = withAuth<GBCRole>(
  async (req, ctx) => {
    const { searchParams } = new URL(req.url);
    const includeRead = searchParams.get("includeRead") !== "false";
    const includeDismissed = searchParams.get("includeDismissed") === "true";

    if (searchParams.has("page")) {
      const pagination = parsePagination(searchParams);
      const data = await getAdminNotificationsPaginated(ctx.session.sub, ctx.session.role as "ADMIN" | "SUPERADMIN", {
        ...pagination,
        search: searchParams.get("search") || undefined,
        type: (searchParams.get("type") as GBCUserNotificationType) || undefined,
        includeRead,
        includeDismissed,
      });
      return NextResponse.json({ success: true, data });
    }

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
