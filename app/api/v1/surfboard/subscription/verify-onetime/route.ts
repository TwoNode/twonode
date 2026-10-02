import { NextResponse } from "next/server";
import { z } from "zod";
import { withAuth } from "@/lib/api/withAuth";
import { validateBody } from "@/lib/api/validate";
import { validateCSRF } from "@/lib/auth/csrf";
import { verifyOneTimeSubscription } from "@/surfboard/services/paystackSubscriptionService";
import { Platform, SurfboardRole } from "@/utils/platform";

const schema = z.object({
  reference: z.string().min(1),
  planId: z.string().min(1),
});

export const POST = withAuth<SurfboardRole>(
  async (req, ctx) => {
    if (!validateCSRF(req)) {
      return NextResponse.json(
        { success: false, error: "Cross-origin request blocked" },
        { status: 403 }
      );
    }
    const { reference, planId } = await validateBody(req, schema);
    const data = await verifyOneTimeSubscription(
      ctx.session.sub,
      reference,
      planId as any
    );
    return NextResponse.json({ success: true, data });
  },
  { platform: Platform.SURFBOARD }
);
