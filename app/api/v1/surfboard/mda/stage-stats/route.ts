import { NextResponse } from "next/server";
import { withAuth } from "@/lib/api/withAuth";
import { getMdaStageStats, type MdaStageRole } from "@/surfboard/services/analyticsService";
import { Platform, SurfboardRole } from "@/utils/platform";

const STAGE_ROLES: MdaStageRole[] = [
  SurfboardRole.ACCOUNTS,
  SurfboardRole.CHARTING,
  SurfboardRole.SURCON,
  SurfboardRole.RECORDS_I,
  SurfboardRole.INTAKE,
  SurfboardRole.RECORDS_II,
  SurfboardRole.ARCHIVE,
] as MdaStageRole[];

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
