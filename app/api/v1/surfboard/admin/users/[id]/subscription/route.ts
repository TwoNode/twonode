import { NextResponse } from "next/server";
import { z } from "zod";
import { withAuth } from "@/lib/api/withAuth";
import { validateBody } from "@/lib/api/validate";
import { validateCSRF } from "@/lib/auth/csrf";
import { updateUserSubscription, cancelUserSubscription } from "@/surfboard/services/adminUserService";
import { Platform, SurfboardRole } from "@/utils/platform";

type RouteCtx = { params: Promise<{ id: string }> };

const subscriptionSchema = z.object({
  planCode: z.string().min(1),
  planName: z.string().min(1),
  amount: z.number(),
  interval: z.string().min(1),
  status: z.string().min(1),
  currentEnd: z.string().nullable().optional(),
});

export const PATCH = withAuth<SurfboardRole>(
  async (req, _ctx, routeCtx: RouteCtx) => {
    if (!validateCSRF(req)) {
      return NextResponse.json({ success: false, error: "Cross-origin request blocked" }, { status: 403 });
    }
    const { id } = await routeCtx.params;
    const body = await validateBody(req, subscriptionSchema);
    const data = await updateUserSubscription({ userId: id, ...body });
    return NextResponse.json({ success: true, data });
  },
  { platform: Platform.SURFBOARD, roles: [SurfboardRole.SUPERADMIN] }
);

export const DELETE = withAuth<SurfboardRole>(
  async (req, _ctx, routeCtx: RouteCtx) => {
    if (!validateCSRF(req)) {
      return NextResponse.json({ success: false, error: "Cross-origin request blocked" }, { status: 403 });
    }
    const { id } = await routeCtx.params;
    const data = await cancelUserSubscription(id);
    return NextResponse.json({ success: true, data });
  },
  { platform: Platform.SURFBOARD, roles: [SurfboardRole.SUPERADMIN] }
);
