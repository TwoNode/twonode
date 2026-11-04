import { NextRequest, NextResponse } from "next/server";
import { withAuth } from "@/lib/api/withAuth";
import {
  getUniqueQueryReasons,
  REVIEWER_ROLE_BY_QUERY_ROLE,
} from "@/surfboard/services/mdaRemarkService";
import { Platform, SurfboardRole } from "@/utils/platform";
import { ForbiddenError, ValidationError } from "@/lib/api/errors";

/**
 * The suggestion list for one reviewer stage's query box: the 50 most recent
 * distinct comments written on any plan at that stage. A reviewer gets the list
 * for their own stage only; ADMIN, SUPERADMIN and MDA_SUPERADMIN may ask for any
 * (they can open every review page). A surveyor, or the Archive role, gets 403
 * (I-056).
 */
export const GET = withAuth<SurfboardRole>(
  async (req: NextRequest, ctx) => {
    const role = req.nextUrl.searchParams.get("role");
    if (!role)
      throw new ValidationError({ role: "role query param is required" });
    // Own keys only: "__proto__" or "constructor" must not count as a stage.
    if (!Object.hasOwn(REVIEWER_ROLE_BY_QUERY_ROLE, role))
      throw new ValidationError({ role: "Invalid role" });
    const stage = REVIEWER_ROLE_BY_QUERY_ROLE[role];

    const anyStage =
      ctx.session.role === SurfboardRole.ADMIN ||
      ctx.session.role === SurfboardRole.SUPERADMIN ||
      ctx.session.role === SurfboardRole.MDA_SUPERADMIN;
    if (!anyStage && ctx.session.role !== stage) throw new ForbiddenError();

    const data = await getUniqueQueryReasons(
      role as Parameters<typeof getUniqueQueryReasons>[0]
    );
    return NextResponse.json({ success: true, data });
  },
  {
    platform: Platform.SURFBOARD,
    roles: [
      SurfboardRole.ACCOUNTS,
      SurfboardRole.CHARTING,
      SurfboardRole.SURCON,
      SurfboardRole.RECORDS_I,
      SurfboardRole.RECORDS_II,
      SurfboardRole.INTAKE,
      SurfboardRole.MDA_SUPERADMIN,
      SurfboardRole.ADMIN,
      SurfboardRole.SUPERADMIN,
    ],
  }
);
