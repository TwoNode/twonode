import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { withAuth } from "@/lib/api/withAuth";
import { validateBody } from "@/lib/api/validate";
import { validateCSRF } from "@/lib/auth/csrf";
import { submitPhysicalCopies } from "@/surfboard/services/batchApprovalService";
import { Platform, SurfboardRole } from "@/utils/platform";

const bodySchema = z.object({ planIds: z.array(z.string().uuid()).min(1) });

/** Bulk — a surveyor marks a selection of their own plans as physically submitted (prerequisite for the Intake queue). */
export const POST = withAuth<SurfboardRole>(
  async (req: NextRequest, ctx) => {
    if (!validateCSRF(req)) {
      return NextResponse.json({ success: false, error: "Cross-origin request blocked" }, { status: 403 });
    }
    const { planIds } = await validateBody(req, bodySchema);
    const data = await submitPhysicalCopies(ctx.session.sub, planIds);
    return NextResponse.json({ success: true, data });
  },
  { platform: Platform.SURFBOARD, roles: [SurfboardRole.USER] }
);
