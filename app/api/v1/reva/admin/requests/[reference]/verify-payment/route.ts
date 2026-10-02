import { NextResponse } from "next/server";
import { z } from "zod";
import { withAuth } from "@/lib/api/withAuth";
import { validateBody } from "@/lib/api/validate";
import { validateCSRF } from "@/lib/auth/csrf";
import { adminVerifyTransaction } from "@/reva/services/paymentService";
import { Platform, RevaRole } from "@/utils/platform";

type RouteCtx = { params: Promise<{ reference: string }> };

const bodySchema = z.object({
  isLive: z.boolean(),
  type: z.enum(["authenticated", "oneTime"]),
});

/** Admin ops tool — manually re-checks a transaction's real Paystack status on demand, distinct from the guest/user self-service verify-after-redirect routes. */
export const POST = withAuth<RevaRole>(
  async (req, ctx, routeCtx: RouteCtx) => {
    if (!validateCSRF(req)) {
      return NextResponse.json(
        { success: false, error: "Cross-origin request blocked" },
        { status: 403 }
      );
    }
    const { reference } = await routeCtx.params;
    const { isLive, type } = await validateBody(req, bodySchema);
    const data = await adminVerifyTransaction(
      reference,
      isLive,
      type,
      ctx.session.sub
    );
    return NextResponse.json({ success: true, data });
  },
  { platform: Platform.REVA, roles: [RevaRole.ADMIN, RevaRole.SUPERADMIN] }
);
