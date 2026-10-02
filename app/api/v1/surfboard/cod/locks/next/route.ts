import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { withAuth } from "@/lib/api/withAuth";
import { validateBody } from "@/lib/api/validate";
import { validateCSRF } from "@/lib/auth/csrf";
import { ForbiddenError } from "@/lib/api/errors";
import {
  MDA_ROLES,
  MDARole,
  getAndLockOldestAvailablePlan,
} from "@/surfboard/services/planLockService";
import { Platform, SurfboardRole } from "@/utils/platform";

const bodySchema = z.object({
  role: z.enum(MDA_ROLES as [MDARole, ...MDARole[]]),
});

/** FIFO claim: get and lock the oldest available plan for the caller's stage. */
export const POST = withAuth<SurfboardRole>(
  async (req: NextRequest, ctx) => {
    if (!validateCSRF(req)) {
      return NextResponse.json(
        { success: false, error: "Cross-origin request blocked" },
        { status: 403 }
      );
    }
    const { role } = await validateBody(req, bodySchema);
    if (
      role !== ctx.session.role &&
      ctx.session.role !== SurfboardRole.SUPERADMIN &&
      ctx.session.role !== SurfboardRole.MDA_SUPERADMIN
    ) {
      throw new ForbiddenError();
    }

    const data = await getAndLockOldestAvailablePlan(role, ctx.session.sub);
    return NextResponse.json({ success: true, data });
  },
  // SUPERADMIN isn't a queue/stage role (MDA_ROLES also doubles as the
  // request body's valid `role` values, so it can't include SUPERADMIN
  // there), but the handler above already expects a SUPERADMIN caller —
  // this array only gates who's ALLOWED to call the route, not which
  // queue they're claiming from. Without this, a SUPERADMIN session was
  // 403'd by withAuth before ever reaching that check (confirmed live:
  // Charting/SURCON/Records I all silently failed to lock for a
  // SUPERADMIN tester).
  {
    platform: Platform.SURFBOARD,
    roles: [...MDA_ROLES, SurfboardRole.SUPERADMIN] as SurfboardRole[],
  }
);
