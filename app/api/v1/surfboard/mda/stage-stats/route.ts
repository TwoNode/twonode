import { NextResponse } from "next/server";
import { withAuth } from "@/lib/api/withAuth";
import { getMdaStageStats, type MdaStageRole } from "@/surfboard/services/analyticsService";
import { MDA_ROLES } from "@/surfboard/services/planLockService";
import { Platform, SurfboardRole } from "@/utils/platform";

// The 7 actual stage roles — derived from planLockService's MDA_ROLES (the
// canonical "role can hold a lock" list) rather than a second hand-written
// copy; MDA_SUPERADMIN is in that list too but isn't itself a stage.
const STAGE_ROLES = MDA_ROLES.filter((r) => r !== SurfboardRole.MDA_SUPERADMIN) as MdaStageRole[];

/**
 * A stage role sees only its own stage's queue depth/time-in-stage.
 * MDA_SUPERADMIN (supervisory, sees every stage) gets all 7 combined.
 * SUPERADMIN gets the same as MDA_SUPERADMIN, matching the platform-wide
 * override this codebase already applies everywhere else in Surfboard.
 */
export const GET = withAuth<SurfboardRole>(
  async (_req, ctx) => {
    if (ctx.session.role === SurfboardRole.MDA_SUPERADMIN || ctx.session.role === SurfboardRole.SUPERADMIN) {
      const entries = await Promise.all(STAGE_ROLES.map(async (role) => [role, await getMdaStageStats(role)] as const));
      return NextResponse.json({ success: true, data: Object.fromEntries(entries) });
    }

    const role = ctx.session.role as MdaStageRole;
    const data = await getMdaStageStats(role);
    return NextResponse.json({ success: true, data: { [role]: data } });
  },
  {
    platform: Platform.SURFBOARD,
    roles: [...STAGE_ROLES, SurfboardRole.MDA_SUPERADMIN, SurfboardRole.SUPERADMIN],
  }
);
