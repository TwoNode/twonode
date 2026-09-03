import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { withAuth } from "@/lib/api/withAuth";
import { validateBody } from "@/lib/api/validate";
import { validateCSRF } from "@/lib/auth/csrf";
import { ForbiddenError } from "@/lib/api/errors";
import { MDA_ROLES, MDARole, releaseAllLocksForUser } from "@/surfboard/services/planLockService";
import { Platform, SurfboardRole } from "@/utils/platform";

const bodySchema = z.object({ role: z.enum(MDA_ROLES as [MDARole, ...MDARole[]]) });

/** Called when leaving the MDA admin page — release every lock the caller holds for their stage. */
export const POST = withAuth<SurfboardRole>(
  async (req: NextRequest, ctx) => {
    if (!validateCSRF(req)) {
      return NextResponse.json({ success: false, error: "Cross-origin request blocked" }, { status: 403 });
    }
    const { role } = await validateBody(req, bodySchema);
    if (role !== ctx.session.role && ctx.session.role !== SurfboardRole.SUPERADMIN && ctx.session.role !== SurfboardRole.MDA_SUPERADMIN) {
      throw new ForbiddenError();
    }

    const data = await releaseAllLocksForUser(role, ctx.session.sub);
    return NextResponse.json({ success: true, data });
  },
  { platform: Platform.SURFBOARD, roles: MDA_ROLES as SurfboardRole[] }
);
