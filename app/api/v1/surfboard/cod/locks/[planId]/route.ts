import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { withAuth } from "@/lib/api/withAuth";
import { validateBody } from "@/lib/api/validate";
import { validateCSRF } from "@/lib/auth/csrf";
import { ForbiddenError, ValidationError } from "@/lib/api/errors";
import {
  acquirePlanLock,
  getPlanLockStatus,
  MDA_ROLES,
  MDARole,
  releasePlanLock,
} from "@/surfboard/services/planLockService";
import { Platform, SurfboardRole } from "@/utils/platform";

type RouteCtx = { params: Promise<{ planId: string }> };

/**
 * Plan-level lock acquire/release/status for one MDA stage. `role` in the
 * body/query must match the caller's own session role — MDA_SUPERADMIN and
 * SUPERADMIN act on behalf of any stage. The original server actions took
 * no role-vs-session check at all (any authenticated user reaching the page
 * could call them, relying entirely on the client only showing the right
 * page per role) — this closes that gap, consistent with the registry work
 * elsewhere in this phase.
 */
function assertRoleMatchesSession(requestedRole: MDARole, sessionRole: SurfboardRole) {
  if (sessionRole === SurfboardRole.SUPERADMIN || sessionRole === SurfboardRole.MDA_SUPERADMIN) return;
  if (requestedRole !== sessionRole) throw new ForbiddenError();
}

const roleQuerySchema = z.enum(MDA_ROLES as [MDARole, ...MDARole[]]);

export const GET = withAuth<SurfboardRole>(
  async (req, ctx, routeCtx: RouteCtx) => {
    const { planId } = await routeCtx.params;
    const parsedRole = roleQuerySchema.safeParse(req.nextUrl.searchParams.get("role"));
    if (!parsedRole.success) throw new ValidationError({ role: "Missing or invalid role" });
    assertRoleMatchesSession(parsedRole.data, ctx.session.role);

    const data = await getPlanLockStatus(planId, parsedRole.data, ctx.session.sub);
    return NextResponse.json({ success: true, data });
  },
  { platform: Platform.SURFBOARD, roles: MDA_ROLES as SurfboardRole[] }
);

const lockBodySchema = z.object({ role: roleQuerySchema });

export const POST = withAuth<SurfboardRole>(
  async (req: NextRequest, ctx, routeCtx: RouteCtx) => {
    if (!validateCSRF(req)) {
      return NextResponse.json({ success: false, error: "Cross-origin request blocked" }, { status: 403 });
    }
    const { planId } = await routeCtx.params;
    const { role } = await validateBody(req, lockBodySchema);
    assertRoleMatchesSession(role, ctx.session.role);

    const data = await acquirePlanLock(planId, role, ctx.session.sub);
    return NextResponse.json({ success: true, data });
  },
  { platform: Platform.SURFBOARD, roles: MDA_ROLES as SurfboardRole[] }
);

export const DELETE = withAuth<SurfboardRole>(
  async (req: NextRequest, ctx, routeCtx: RouteCtx) => {
    if (!validateCSRF(req)) {
      return NextResponse.json({ success: false, error: "Cross-origin request blocked" }, { status: 403 });
    }
    const { planId } = await routeCtx.params;
    const { role } = await validateBody(req, lockBodySchema);
    assertRoleMatchesSession(role, ctx.session.role);

    const data = await releasePlanLock(planId, role, ctx.session.sub);
    return NextResponse.json({ success: true, data });
  },
  { platform: Platform.SURFBOARD, roles: MDA_ROLES as SurfboardRole[] }
);
