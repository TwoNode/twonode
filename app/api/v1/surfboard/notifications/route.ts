import { NextResponse } from "next/server";
import { z } from "zod";
import { withAuth } from "@/lib/api/withAuth";
import { validateBody } from "@/lib/api/validate";
import { validateCSRF } from "@/lib/auth/csrf";
import { getUserNotifications, createNotification } from "@/surfboard/services/notificationService";
import { Platform, SurfboardRole } from "@/utils/platform";

export const GET = withAuth<SurfboardRole>(
  async (req, ctx) => {
    const params = req.nextUrl.searchParams;
    const includeRead = params.get("includeRead") !== "false";
    const includeDismissed = params.get("includeDismissed") === "true";
    const limit = params.get("limit") ? Number(params.get("limit")) : undefined;

    const data = await getUserNotifications(ctx.session.sub, ctx.session.role, { includeRead, includeDismissed, limit });
    return NextResponse.json({ success: true, data });
  },
  { platform: Platform.SURFBOARD }
);

const createSchema = z.object({
  type: z.enum(["INFO", "SUCCESS", "WARNING", "ERROR", "SYSTEM", "PLAN", "SHARING"]),
  title: z.string().min(1),
  message: z.string().min(1),
  audience: z.enum(["SPECIFIC_USERS", "GENERAL_ADMINS", "SUPERADMIN", "ALL_USERS"]),
  userIds: z.array(z.string()).optional(),
  link: z.string().optional(),
  metadata: z.any().optional(),
  sendEmail: z.boolean().optional(),
});

export const POST = withAuth<SurfboardRole>(
  async (req) => {
    if (!validateCSRF(req)) {
      return NextResponse.json({ success: false, error: "Cross-origin request blocked" }, { status: 403 });
    }
    const body = await validateBody(req, createSchema);
    const data = await createNotification(body as any);
    return NextResponse.json({ success: true, data });
  },
  { platform: Platform.SURFBOARD, roles: [SurfboardRole.ADMIN, SurfboardRole.SUPERADMIN] }
);
