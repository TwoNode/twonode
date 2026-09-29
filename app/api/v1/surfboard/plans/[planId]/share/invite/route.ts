import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { withAuth } from "@/lib/api/withAuth";
import { validateBody } from "@/lib/api/validate";
import { validateCSRF } from "@/lib/auth/csrf";
import { getUserDisplayName, invitePlanShareByEmail } from "@/surfboard/services/planService";
import { Platform, SurfboardRole } from "@/utils/platform";

type RouteCtx = { params: Promise<{ planId: string }> };
const bodySchema = z.object({ email: z.string().email() });

/** Shares a plan by email, whether or not the recipient has a Surfboard account yet — see invitePlanShareByEmail. */
export const POST = withAuth<SurfboardRole>(
  async (req: NextRequest, ctx, routeCtx: RouteCtx) => {
    if (!validateCSRF(req)) {
      return NextResponse.json({ success: false, error: "Cross-origin request blocked" }, { status: 403 });
    }
    const { planId } = await routeCtx.params;
    const { email } = await validateBody(req, bodySchema);
    const user = await getUserDisplayName(ctx.session.sub);
    const data = await invitePlanShareByEmail(ctx.session.sub, user, planId, email);
    return NextResponse.json({ success: true, data });
  },
  { platform: Platform.SURFBOARD, roles: [SurfboardRole.USER] }
);
