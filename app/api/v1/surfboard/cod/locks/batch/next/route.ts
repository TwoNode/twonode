import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { withAuth } from "@/lib/api/withAuth";
import { validateBody } from "@/lib/api/validate";
import { validateCSRF } from "@/lib/auth/csrf";
import { ForbiddenError } from "@/lib/api/errors";
import {
  BATCH_LOCK_ROLES,
  BatchLockRole,
  getAndLockBatchForAccounts,
  getAndLockBatchForIntake,
  getAndLockBatchForRecordsII,
} from "@/surfboard/services/planLockService";
import { Platform, SurfboardRole } from "@/utils/platform";

const bodySchema = z.object({ role: z.enum(BATCH_LOCK_ROLES as [BatchLockRole, ...BatchLockRole[]]) });

const ROLES_ALLOWED: SurfboardRole[] = [
  SurfboardRole.ACCOUNTS,
  SurfboardRole.INTAKE,
  SurfboardRole.RECORDS_II,
  SurfboardRole.MDA_SUPERADMIN,
  SurfboardRole.SUPERADMIN,
];

/** FIFO claim of the oldest ready batch, for the 3 stages whose locking is batch- not plan-level. */
export const POST = withAuth<SurfboardRole>(
  async (req: NextRequest, ctx) => {
    if (!validateCSRF(req)) {
      return NextResponse.json({ success: false, error: "Cross-origin request blocked" }, { status: 403 });
    }
    const { role } = await validateBody(req, bodySchema);
    if (role !== ctx.session.role && ctx.session.role !== SurfboardRole.SUPERADMIN && ctx.session.role !== SurfboardRole.MDA_SUPERADMIN) {
      throw new ForbiddenError();
    }

    const data =
      role === "ACCOUNTS"
        ? await getAndLockBatchForAccounts(ctx.session.sub)
        : role === "INTAKE"
          ? await getAndLockBatchForIntake(ctx.session.sub)
          : await getAndLockBatchForRecordsII(ctx.session.sub);

    return NextResponse.json({ success: true, data });
  },
  { platform: Platform.SURFBOARD, roles: ROLES_ALLOWED }
);
