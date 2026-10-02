import { NextResponse } from "next/server";
import { z } from "zod";
import { withAuth } from "@/lib/api/withAuth";
import { validateBody } from "@/lib/api/validate";
import { validateCSRF } from "@/lib/auth/csrf";
import {
  deleteNotification,
  updateNotification,
} from "@/surfboard/services/notificationService";
import { Platform, SurfboardRole } from "@/utils/platform";

type RouteCtx = { params: Promise<{ id: string }> };

const updateSchema = z.object({
  type: z
    .enum(["INFO", "SUCCESS", "WARNING", "ERROR", "SYSTEM", "PLAN", "SHARING"])
    .optional(),
  title: z.string().min(1).optional(),
  message: z.string().min(1).optional(),
  audience: z
    .enum(["SPECIFIC_USERS", "GENERAL_ADMINS", "SUPERADMIN", "ALL_USERS"])
    .optional(),
  userIds: z.array(z.string()).optional(),
  link: z.string().nullable().optional(),
  showAsModal: z.boolean().optional(),
  startsAt: z.coerce.date().nullable().optional(),
  endsAt: z.coerce.date().nullable().optional(),
});

export const PATCH = withAuth<SurfboardRole>(
  async (req, _ctx, routeCtx: RouteCtx) => {
    if (!validateCSRF(req)) {
      return NextResponse.json(
        { success: false, error: "Cross-origin request blocked" },
        { status: 403 }
      );
    }
    const { id } = await routeCtx.params;
    const body = await validateBody(req, updateSchema);
    const data = await updateNotification(id, body as any);
    return NextResponse.json({ success: true, data });
  },
  {
    platform: Platform.SURFBOARD,
    roles: [SurfboardRole.ADMIN, SurfboardRole.SUPERADMIN],
  }
);

export const DELETE = withAuth<SurfboardRole>(
  async (req, _ctx, routeCtx: RouteCtx) => {
    if (!validateCSRF(req)) {
      return NextResponse.json(
        { success: false, error: "Cross-origin request blocked" },
        { status: 403 }
      );
    }
    const { id } = await routeCtx.params;
    const data = await deleteNotification(id);
    return NextResponse.json({ success: true, data });
  },
  {
    platform: Platform.SURFBOARD,
    roles: [SurfboardRole.ADMIN, SurfboardRole.SUPERADMIN],
  }
);
